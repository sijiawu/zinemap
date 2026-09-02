import { createClient } from "@supabase/supabase-js"

const HELP = `Usage:
  pnpm admin:change-email -- --user-id <uuid> --new-email <email> [--apply]

Options:
  --user-id    Supabase Auth user ID
  --new-email  New login and profile email
  --apply      Perform the update (without this flag, the script is a dry run)
  --help       Show this help

Environment:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`

function parseArgs(argv) {
  const args = new Map()

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === "--") {
      continue
    }

    if (argument === "--apply" || argument === "--help") {
      args.set(argument, true)
      continue
    }

    if (argument === "--user-id" || argument === "--new-email") {
      const value = argv[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${argument}`)
      }
      args.set(argument, value)
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  return args
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

let args
try {
  args = parseArgs(process.argv.slice(2))
} catch (error) {
  fail(`${error.message}\n\n${HELP}`)
}

if (args.has("--help")) {
  console.log(HELP)
  process.exit(0)
}

const userId = args.get("--user-id")
const newEmail = args.get("--new-email")?.trim().toLowerCase()
const shouldApply = args.has("--apply")

if (!userId || !newEmail) {
  fail(`Both --user-id and --new-email are required.\n\n${HELP}`)
}

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
  fail("--user-id must be a valid UUID.")
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
  fail("--new-email must be a valid email address.")
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  fail(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Run this command from the project root with .env.local configured."
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)

if (userError || !userData.user.email) {
  fail(`Could not load user: ${userError?.message ?? "User has no email"}`)
}

const oldEmail = userData.user.email

if (oldEmail.toLowerCase() === newEmail) {
  console.log("No change needed; the user already has that email.")
  process.exit(0)
}

const { count: homePinCount, error: pinError } = await supabase
  .from("home_pins")
  .select("id", { count: "exact", head: true })
  .eq("user_email", oldEmail)

if (pinError) {
  fail(`Could not check home pins: ${pinError.message}`)
}

if ((homePinCount ?? 0) > 0) {
  fail(
    `Aborted without changes: this user has ${homePinCount} home pin(s). ` +
      "Migrate those email references first."
  )
}

const { data: profile, error: profileLookupError } = await supabase
  .from("profiles")
  .select("id, email")
  .eq("id", userId)
  .maybeSingle()

if (profileLookupError) {
  fail(`Could not load profile: ${profileLookupError.message}`)
}

if (profile?.email && profile.email.toLowerCase() !== oldEmail.toLowerCase()) {
  fail(
    `Aborted without changes: Auth uses ${oldEmail}, but the profile uses ${profile.email}. ` +
      "Resolve the mismatch manually first."
  )
}

console.log(`${shouldApply ? "Changing" : "Would change"} ${oldEmail} to ${newEmail}.`)

if (!shouldApply) {
  console.log("Dry run complete. Re-run with --apply to perform the update.")
  process.exit(0)
}

if (profile) {
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ email: newEmail })
    .eq("id", userId)

  if (profileUpdateError) {
    fail(`Could not update profile: ${profileUpdateError.message}`)
  }
}

const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
  email: newEmail,
})

if (authUpdateError) {
  if (profile) {
    const { error: rollbackError } = await supabase
      .from("profiles")
      .update({ email: oldEmail })
      .eq("id", userId)

    if (rollbackError) {
      fail(
        `Auth update failed and profile rollback failed. ` +
          `Auth error: ${authUpdateError.message}. Rollback error: ${rollbackError.message}`
      )
    }
  }

  fail(`Could not update login email: ${authUpdateError.message}`)
}

const { data: verification, error: verificationError } =
  await supabase.auth.admin.getUserById(userId)

if (verificationError || verification.user.email?.toLowerCase() !== newEmail) {
  fail(
    `The update returned successfully but verification failed: ${
      verificationError?.message ?? "Auth email does not match"
    }`
  )
}

console.log(`Changed login${profile ? " and profile" : ""} email to ${newEmail}.`)

export type Supporter = {
  name: string;
  logoSrc: string;
  websiteUrl: string;
  width: number;
  height: number;
};

export const supporters: Supporter[] = [
  {
    name: "Center for Cartoon Studies",
    logoSrc: "/supporter-logos/Center%20for%20Cartoon%20Studies.jpg",
    websiteUrl: "https://www.cartoonstudies.org/",
    width: 420,
    height: 160,
  },
  {
    name: "School of Zines",
    logoSrc: "/supporter-logos/School%20of%20Zines.png",
    websiteUrl: "https://www.schoolofzines.com.au/",
    width: 420,
    height: 160,
  },
  {
    name: "Mildpain",
    logoSrc: "/supporter-logos/Mildpain.png",
    websiteUrl: "https://mildpain.art/",
    width: 420,
    height: 160,
  },
  {
    name: "Pizzeria Press",
    logoSrc: "/supporter-logos/Pizzeria%20Press.png",
    websiteUrl: "https://www.instagram.com/pizzeria.press/",
    width: 420,
    height: 160,
  },
];

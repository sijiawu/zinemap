import { useState, useEffect } from 'react'
import { Store, Library, Event } from '@/lib/types'

type LocationItem = Store | Library | Event

interface UseLocationFiltersProps<T extends LocationItem> {
  items: T[]
}

interface UseLocationFiltersReturn {
  selectedCountry: string
  selectedState: string
  selectedCity: string
  setSelectedCountry: (country: string) => void
  setSelectedState: (state: string) => void
  setSelectedCity: (city: string) => void
  countries: string[]
  states: string[]
  cities: string[]
  clearLocationFilters: () => void
}

export function useLocationFilters<T extends LocationItem>({
  items
}: UseLocationFiltersProps<T>): UseLocationFiltersReturn {
  const [selectedCountry, setSelectedCountry] = useState("all")
  const [selectedState, setSelectedState] = useState("all")
  const [selectedCity, setSelectedCity] = useState("all")

  // Get unique countries, states, and cities for filters
  const countries = Array.from(new Set(items.map(item => item.country))).sort()
  
  // Filter states based on selected country
  const filteredItemsForStates = selectedCountry === "all" 
    ? items 
    : items.filter(item => item.country === selectedCountry)
  
  const states = Array.from(new Set(filteredItemsForStates.filter(item => item.state).map(item => item.state!))).sort()
  
  // Filter cities based on selected country AND state
  const filteredItemsForCities = selectedCountry === "all" 
    ? items 
    : items.filter(item => item.country === selectedCountry)
  
  const filteredItemsForCitiesByState = selectedState === "all"
    ? filteredItemsForCities
    : filteredItemsForCities.filter(item => item.state === selectedState)
  
  const cities = Array.from(new Set(filteredItemsForCitiesByState.map(item => item.city))).sort()

  // Reset state and city whenever country changes (to ensure clean lower selections)
  useEffect(() => {
    setSelectedState("all")
    setSelectedCity("all")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry])

  // Reset city when state changes (always revert city to all on change)
  useEffect(() => {
    setSelectedCity("all")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState])

  const clearLocationFilters = () => {
    setSelectedCountry("all")
    setSelectedState("all")
    setSelectedCity("all")
  }

  return {
    selectedCountry,
    selectedState,
    selectedCity,
    setSelectedCountry,
    setSelectedState,
    setSelectedCity,
    countries,
    states,
    cities,
    clearLocationFilters
  }
}

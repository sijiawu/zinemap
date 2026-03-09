"use client"

import { useEffect } from 'react'

export default function FilloutButton() {
  useEffect(() => {
    const timerId = setTimeout(() => {
      if (!document.querySelector('script[src="https://server.fillout.com/embed/v1/"]')) {
        const script = document.createElement('script')
        script.src = 'https://server.fillout.com/embed/v1/'
        script.async = true
        document.body.appendChild(script)
      }

      const applyStyles = () => {
        const filloutButton = document.querySelector('[data-fillout-id="5jJ4xDhgxNus"]') as HTMLElement;
        if (filloutButton) {
          filloutButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          filloutButton.style.borderRadius = '8px';
          filloutButton.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
          filloutButton.style.cursor = 'pointer';
          filloutButton.style.pointerEvents = 'auto';
        }
      };

      setTimeout(applyStyles, 500);
      setTimeout(applyStyles, 1500);
    }, 4000)

    return () => clearTimeout(timerId)
  }, [])

  return (
    <div 
      data-fillout-id="5jJ4xDhgxNus" 
      data-fillout-embed-type="popup" 
      data-fillout-button-text="ZineMap Mini Survey"
      data-fillout-button-color="#3B82F6" 
      data-fillout-button-size="small" 
      data-fillout-button-float="bottom-left" 
      data-fillout-inherit-parameters 
      data-fillout-popup-size="small"
    />
  )
}

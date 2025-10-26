"use client"

import { useEffect } from 'react'

export default function FilloutButton() {
  useEffect(() => {
    // Load the Fillout script if it doesn't exist
    if (!document.querySelector('script[src="https://server.fillout.com/embed/v1/"]')) {
      const script = document.createElement('script')
      script.src = 'https://server.fillout.com/embed/v1/'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        [data-fillout-id="5jJ4xDhgxNus"] {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        [data-fillout-id="5jJ4xDhgxNus"]:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
      `}} />
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
    </>
  )
}

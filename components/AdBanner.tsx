import React, { useEffect } from 'react';

// This lets TypeScript know that 'adsbygoogle' can exist on the window object.
declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

/**
 * A component to display a Google AdSense ad unit.
 * IMPORTANT: For this to work, you must:
 * 1. Add the AdSense script to your index.html.
 * 2. Replace the placeholder 'data-ad-client' and 'data-ad-slot' with your own valid IDs from your AdSense account.
 */
const AdBanner: React.FC = () => {
  useEffect(() => {
    // The AdSense script can sometimes run before the component's layout is fully calculated,
    // leading to an "availableWidth=0" error. Wrapping the ad push in a short timeout
    // delays its execution until after the browser has had a chance to render the component,
    // ensuring the ad container has a valid size.
    const adPushTimeout = setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("Could not initialize AdSense ad unit:", e);
      }
    }, 100);

    // Cleanup the timeout if the component unmounts before it fires.
    return () => clearTimeout(adPushTimeout);
  }, []);

  return (
    // FIX: Added min-h-[90px] to prevent the container from collapsing before the ad loads,
    // which is the common cause of the "availableWidth=0" error. This ensures the ad slot has a valid size.
    <div className="w-full bg-gray-200 p-2 rounded-lg text-center min-h-[90px] flex items-center justify-center" aria-label="Advertisement">
       <span className="text-xs text-gray-500 absolute">Advertisement</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot="YYYYYYYYYY"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdBanner;
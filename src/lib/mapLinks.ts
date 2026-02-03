export function openInMaps(address: string, latitude?: number, longitude?: number) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMac = /Macintosh/.test(navigator.userAgent);

  if (latitude && longitude) {
    if (isIOS || isMac) {
      window.open(`https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`, '_blank');
    }
  } else {
    const encodedAddress = encodeURIComponent(address);
    if (isIOS || isMac) {
      window.open(`https://maps.apple.com/?daddr=${encodedAddress}&dirflg=d`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  }
}

export function openNavigationBetween(
  pickupAddress: string,
  dropoffAddress: string,
  pickupLat?: number,
  pickupLng?: number,
  dropoffLat?: number,
  dropoffLng?: number
) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMac = /Macintosh/.test(navigator.userAgent);

  if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
    if (isIOS || isMac) {
      window.open(`https://maps.apple.com/?saddr=${pickupLat},${pickupLng}&daddr=${dropoffLat},${dropoffLng}&dirflg=d`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${pickupLat},${pickupLng}&destination=${dropoffLat},${dropoffLng}`, '_blank');
    }
  } else {
    const encodedPickup = encodeURIComponent(pickupAddress);
    const encodedDropoff = encodeURIComponent(dropoffAddress);
    if (isIOS || isMac) {
      window.open(`https://maps.apple.com/?saddr=${encodedPickup}&daddr=${encodedDropoff}&dirflg=d`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodedPickup}&destination=${encodedDropoff}`, '_blank');
    }
  }
}

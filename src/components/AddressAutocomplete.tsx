import { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address',
  required = false,
  className = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
}: AddressAutocompleteProps) {
  const { isLoaded } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'geometry', 'name', 'address_components'],
        types: ['address'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.formatted_address) {
          onChange(place.formatted_address);
          if (onPlaceSelect) {
            onPlaceSelect(place);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}

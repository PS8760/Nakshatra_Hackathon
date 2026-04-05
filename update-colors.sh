#!/bin/bash

# Color Replacement Script
# Old Blue → New Blue: #4A7FFF
# Old Green → New Green: #4AFFB8
# Old Yellow → New Yellow: #FFB84A
# Old Red → New Red: #FF4A6B

echo "Updating color palette across the website..."

# Find all TSX files and replace colors
find frontend -name "*.tsx" -type f -exec sed -i '' \
  -e 's/#2563EB/#4A7FFF/g' \
  -e 's/#1E40AF/#3A6FEF/g' \
  -e 's/#3B82F6/#5A8FFF/g' \
  -e 's/#10B981/#4AFFB8/g' \
  -e 's/#059669/#3AEFA8/g' \
  -e 's/#34D399/#5AFFC8/g' \
  -e 's/#FBBF24/#FFB84A/g' \
  -e 's/#F59E0B/#EFA83A/g' \
  -e 's/#FCD34D/#FFC85A/g' \
  -e 's/#EF4444/#FF4A6B/g' \
  -e 's/#DC2626/#EF3A5B/g' \
  -e 's/#F87171/#FF5A7B/g' \
  {} \;

echo "Color palette updated successfully!"
echo "New colors:"
echo "  Blue: #4A7FFF"
echo "  Green: #4AFFB8"
echo "  Yellow: #FFB84A"
echo "  Red: #FF4A6B"

// --- Data ---
var places = JSON.parse(localStorage.getItem('myPlaces') || '[]');
var markers = {};
var tempMarker = null;
var pendingLatLng = null;
var activeTagFilter = null;

// Category configuration
var categories = {
  default: { label: 'General', color: '#4285f4' },
  food: { label: 'Food & Drink', color: '#ea4335' },
  shop: { label: 'Shopping', color: '#fbbc04' },
  nature: { label: 'Nature', color: '#34a853' },
  work: { label: 'Work', color: '#9c27b0' },
  home: { label: 'Home', color: '#ff6d00' },
};

// --- Map Setup ---
var map = L.map('map').setView([20, 0], 3);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

// Try to get user's location
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      map.setView([pos.coords.latitude, pos.coords.longitude], 13);
    },
    function () {}
  );
}

// --- Marker helpers ---
function createIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: '<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="' + color + '"/>'
      + '<circle cx="14" cy="14" r="6" fill="#fff"/>'
      + '</svg>',
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

function buildPopupHTML(place) {
  var cat = categories[place.category] || categories.default;
  var desc = place.description ? '<p>' + escapeHTML(place.description) + '</p>' : '';

  var tagsHTML = '';
  if (place.tags && place.tags.length > 0) {
    tagsHTML = '<div class="popup-tags">'
      + place.tags.map(function (t) { return '<span class="place-tag">' + escapeHTML(t) + '</span>'; }).join(' ')
      + '</div>';
  }

  var cityHTML = place.city ? '<div class="popup-city">' + escapeHTML(place.city) + '</div>' : '';

  return '<div class="popup-content">'
    + '<span class="popup-category" style="background:' + cat.color + '">' + cat.label + '</span>'
    + '<h4>' + escapeHTML(place.name) + '</h4>'
    + desc
    + tagsHTML
    + cityHTML
    + '<div class="popup-actions">'
    + '<button class="secondary" onclick="deletePlace(\'' + place.id + '\')">Delete</button>'
    + '</div>'
    + '</div>';
}

function addMarkerToMap(place) {
  var cat = categories[place.category] || categories.default;
  var marker = L.marker([place.lat, place.lng], {
    icon: createIcon(cat.color),
  }).addTo(map);

  marker.bindPopup(buildPopupHTML(place));
  markers[place.id] = marker;
}

// --- Map click handler ---
map.on('click', function (e) {
  pendingLatLng = e.latlng;

  if (tempMarker) {
    map.removeLayer(tempMarker);
  }

  tempMarker = L.marker(e.latlng, {
    icon: createIcon('#999'),
    opacity: 0.7,
  }).addTo(map);

  showForm();
  reverseGeocodeForForm(e.latlng.lat, e.latlng.lng);
});

// ============================================================
// TEXT SEARCH - Find places by name using Nominatim geocoding
// ============================================================

function showTextSearch() {
  document.getElementById('text-search-panel').classList.remove('hidden');
  document.getElementById('geo-search-input').value = '';
  document.getElementById('geo-results').innerHTML = '';
  document.getElementById('geo-search-input').focus();
}

function closeTextSearch() {
  document.getElementById('text-search-panel').classList.add('hidden');
  document.getElementById('geo-results').innerHTML = '';
}

function geoSearch() {
  var query = document.getElementById('geo-search-input').value.trim();
  if (!query) return;

  var resultsDiv = document.getElementById('geo-results');
  resultsDiv.innerHTML = '<div class="loading">Searching...</div>';

  fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&q=' + encodeURIComponent(query))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      resultsDiv.innerHTML = '';
      if (data.length === 0) {
        resultsDiv.innerHTML = '<div class="loading">No results found. Try a different search.</div>';
        return;
      }

      data.forEach(function (item) {
        var div = document.createElement('div');
        div.className = 'geo-result-item';

        var nameParts = item.display_name.split(',');
        var name = nameParts[0];
        var address = nameParts.slice(1, 4).join(',').trim();

        div.innerHTML = '<div class="result-name">' + escapeHTML(name) + '</div>'
          + '<div class="result-address">' + escapeHTML(address) + '</div>';

        div.onclick = function () {
          selectGeoResult(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
        };

        resultsDiv.appendChild(div);
      });
    })
    .catch(function () {
      resultsDiv.innerHTML = '<div class="loading">Search failed. Check your connection.</div>';
    });
}

// Enter key triggers search
document.getElementById('geo-search-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    geoSearch();
  }
});

function selectGeoResult(lat, lng, displayName) {
  closeTextSearch();

  pendingLatLng = { lat: lat, lng: lng };

  if (tempMarker) {
    map.removeLayer(tempMarker);
  }
  tempMarker = L.marker([lat, lng], {
    icon: createIcon('#999'),
    opacity: 0.7,
  }).addTo(map);

  map.setView([lat, lng], 15);

  // Pre-fill the form with the place name
  var shortName = displayName.split(',')[0];
  showForm(shortName);

  // Show location preview
  document.getElementById('form-location-preview').classList.remove('hidden');
  document.getElementById('form-location-name').textContent = displayName.split(',').slice(0, 3).join(',');
}

// ============================================================
// IMAGE SCAN - OCR + AI interpretation to extract places
// ============================================================

function triggerPhotoUpload() {
  document.getElementById('photo-input').click();
}

// AI Text Interpreter - extracts place names from raw OCR text
function extractPlaceCandidates(text) {
  var lines = text.split('\n')
    .map(function (l) { return l.trim(); })
    .filter(function (l) { return l.length > 2; });

  // Noise words that are unlikely to be place names
  var noisePatterns = [
    /^(menu|price|total|subtotal|tax|tip|receipt|order|qty|item|date|time|thank|welcome|enjoy|please|www\.|http|@|#\d)$/i,
    /^\d+[\.\,]\d{2}$/, // prices like 12.99
    /^\$[\d\.\,]+$/, // dollar amounts
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/, // dates
    /^\d{1,2}:\d{2}/, // times
    /^tel|^phone|^fax|^email/i,
    /^\d+$/, // just numbers
    /^[^a-zA-Z]*$/, // no letters at all
  ];

  var candidates = [];
  var seen = {};

  lines.forEach(function (line) {
    // Skip noise
    for (var i = 0; i < noisePatterns.length; i++) {
      if (noisePatterns[i].test(line)) return;
    }

    // Clean up OCR artifacts
    var cleaned = line
      .replace(/[|}{[\]\\]/g, '') // remove OCR artifacts
      .replace(/\s{2,}/g, ' ')    // collapse spaces
      .trim();

    if (cleaned.length < 3 || cleaned.length > 120) return;

    // Score this line as a potential place name
    var score = scorePlaceCandidate(cleaned);
    if (score > 0) {
      var key = cleaned.toLowerCase();
      if (!seen[key]) {
        seen[key] = true;
        candidates.push({ text: cleaned, score: score });
      }
    }
  });

  // Also try to extract multi-word proper nouns and addresses from longer text blocks
  var fullText = lines.join(' ');
  var addressPattern = /\d{1,5}\s+[A-Z][a-zA-Z\s]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Pl|Place|Ct|Court)\.?(?:\s*,?\s*[A-Z][a-zA-Z\s]+)?/g;
  var match;
  while ((match = addressPattern.exec(fullText)) !== null) {
    var addr = match[0].trim();
    var addrKey = addr.toLowerCase();
    if (!seen[addrKey]) {
      seen[addrKey] = true;
      candidates.push({ text: addr, score: 8 });
    }
  }

  // Sort by score (highest first)
  candidates.sort(function (a, b) { return b.score - a.score; });

  // Return top candidates (limit to prevent too many API calls)
  return candidates.slice(0, 10);
}

function scorePlaceCandidate(text) {
  var score = 0;

  // Starts with capital letter (proper noun)
  if (/^[A-Z]/.test(text)) score += 2;

  // Contains multiple capitalized words (likely a place name)
  var capsWords = text.match(/[A-Z][a-zA-Z]+/g);
  if (capsWords && capsWords.length >= 2) score += 2;

  // Contains address-like patterns
  if (/\d{1,5}\s+[A-Z]/.test(text)) score += 3;

  // Contains location keywords
  if (/\b(restaurant|cafe|bar|hotel|park|museum|church|theater|theatre|market|plaza|square|beach|lake|mountain|bridge|station|airport|hospital|university|school|library|store|shop|mall|garden|temple|palace|castle|tower|port|harbor|harbour)\b/i.test(text)) score += 4;

  // Contains street/address suffixes
  if (/\b(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|pl|place|ct|court|hwy|highway)\b\.?\s/i.test(text)) score += 3;

  // Contains city/country indicators
  if (/\b(city|town|village|district|borough|county|state|province)\b/i.test(text)) score += 2;

  // Has a reasonable length for a place name (3-60 chars)
  if (text.length >= 5 && text.length <= 60) score += 1;

  // Penalize things that look like UI elements or generic text
  if (/\b(click|tap|swipe|login|sign|password|email|subscribe|follow|share|like|comment|download|upload|settings|profile|account|cancel|confirm|ok|yes|no)\b/i.test(text)) score -= 5;

  // Penalize very long strings (probably paragraphs, not place names)
  if (text.length > 80) score -= 3;

  // Penalize all-caps (usually headers/labels, not place names)
  if (text === text.toUpperCase() && text.length > 10) score -= 1;

  return score;
}

// Geocode a single candidate, returns a promise
function geocodeCandidate(candidate) {
  return fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(candidate.text))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.length > 0) {
        return {
          query: candidate.text,
          score: candidate.score,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
          name: data[0].display_name.split(',')[0],
          address: data[0].display_name.split(',').slice(1, 4).join(',').trim()
        };
      }
      return null;
    })
    .catch(function () { return null; });
}

// Stagger requests to respect Nominatim rate limits (1 req/sec)
function geocodeCandidatesSequentially(candidates) {
  var results = [];
  var index = 0;

  return new Promise(function (resolve) {
    function next() {
      if (index >= candidates.length) {
        resolve(results);
        return;
      }
      var candidate = candidates[index];
      index++;

      geocodeCandidate(candidate).then(function (result) {
        if (result) {
          results.push(result);
          // Update UI as results come in
          renderScanFoundPlaces(results);
        }
        // 1.1 second delay for Nominatim rate limit
        setTimeout(next, 1100);
      });
    }
    next();
  });
}

var scanFoundPlaces = [];

document.getElementById('photo-input').addEventListener('change', function (e) {
  var file = e.target.files[0];
  if (!file) return;

  var panel = document.getElementById('scan-panel');
  var title = document.getElementById('scan-title');
  var progressFill = document.getElementById('scan-progress-fill');
  var resultsDiv = document.getElementById('scan-results');

  // Show panel, reset state
  panel.classList.remove('hidden');
  resultsDiv.classList.add('hidden');
  title.textContent = 'Scanning image for text...';
  progressFill.style.width = '10%';
  document.getElementById('scan-progress').classList.remove('hidden');
  scanFoundPlaces = [];

  // Use Tesseract.js to extract text from image
  Tesseract.recognize(file, 'eng+spa+fra+por+ita+deu', {
    logger: function (m) {
      if (m.status === 'recognizing text' && m.progress) {
        progressFill.style.width = Math.round(10 + m.progress * 60) + '%';
      }
    }
  }).then(function (result) {
    progressFill.style.width = '75%';
    var text = result.data.text || '';

    if (!text.trim()) {
      title.textContent = 'No text found in this image.';
      setTimeout(function () {
        document.getElementById('scan-progress').classList.add('hidden');
      }, 1000);
      return;
    }

    title.textContent = 'Analyzing text for places...';

    // AI interpretation step: extract place candidates
    var candidates = extractPlaceCandidates(text);

    if (candidates.length === 0) {
      title.textContent = 'No place names detected. Try manual search below.';
      progressFill.style.width = '100%';
      document.getElementById('scan-progress').classList.add('hidden');
      resultsDiv.classList.remove('hidden');
      document.getElementById('scan-found-places').innerHTML = '';
      document.getElementById('scan-raw-text').textContent = text;
      return;
    }

    title.textContent = 'Found ' + candidates.length + ' potential places. Looking them up...';
    resultsDiv.classList.remove('hidden');
    document.getElementById('scan-found-places').innerHTML = '<div class="loading">Searching for locations...</div>';
    document.getElementById('scan-raw-text').textContent = text;

    // Geocode all candidates
    geocodeCandidatesSequentially(candidates).then(function (foundPlaces) {
      progressFill.style.width = '100%';
      document.getElementById('scan-progress').classList.add('hidden');
      scanFoundPlaces = foundPlaces;

      if (foundPlaces.length === 0) {
        title.textContent = 'No locations found. Try manual search below.';
        document.getElementById('scan-found-places').innerHTML = '<div class="loading">No matching locations. Try editing text and searching manually.</div>';
      } else {
        title.textContent = foundPlaces.length + ' place' + (foundPlaces.length > 1 ? 's' : '') + ' found!';
        renderScanFoundPlaces(foundPlaces);
      }
    });
  }).catch(function () {
    title.textContent = 'Failed to scan image. Try a clearer screenshot.';
    document.getElementById('scan-progress').classList.add('hidden');
  });

  // Reset so same file can be re-selected
  e.target.value = '';
});

function renderScanFoundPlaces(foundPlaces) {
  var container = document.getElementById('scan-found-places');
  container.innerHTML = '';

  if (foundPlaces.length > 1) {
    var addAllBtn = document.createElement('button');
    addAllBtn.className = 'scan-add-all-btn';
    addAllBtn.textContent = 'Add All ' + foundPlaces.length + ' Places';
    addAllBtn.onclick = function () {
      addAllScanPlaces();
    };
    container.appendChild(addAllBtn);
  }

  foundPlaces.forEach(function (place, index) {
    var div = document.createElement('div');
    div.className = 'scan-place-item';
    div.setAttribute('data-index', index);

    div.innerHTML = '<div class="scan-place-info">'
      + '<div class="scan-place-name">' + escapeHTML(place.name) + '</div>'
      + '<div class="scan-place-address">' + escapeHTML(place.address) + '</div>'
      + '<div class="scan-place-query">Matched: "' + escapeHTML(place.query) + '"</div>'
      + '</div>'
      + '<button class="scan-add-btn" data-index="' + index + '">Add</button>';

    div.querySelector('.scan-add-btn').onclick = function (e) {
      e.stopPropagation();
      addScanPlace(index);
    };

    // Click the row to preview on map
    div.onclick = function () {
      map.setView([place.lat, place.lng], 15);
    };

    container.appendChild(div);
  });
}

function addScanPlace(index) {
  var place = scanFoundPlaces[index];
  if (!place) return;

  // Check if already added
  var btn = document.querySelector('.scan-add-btn[data-index="' + index + '"]');
  if (btn && btn.disabled) return;

  var newPlace = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: place.name,
    description: 'Scanned from image',
    category: 'default',
    tags: ['scanned'],
    lat: place.lat,
    lng: place.lng,
    city: '',
    createdAt: new Date().toISOString(),
  };

  places.push(newPlace);
  persistPlaces();
  addMarkerToMap(newPlace);

  // Reverse geocode for city
  reverseGeocode(newPlace.lat, newPlace.lng, function (city) {
    if (city) {
      newPlace.city = city;
      persistPlaces();
      if (markers[newPlace.id]) {
        markers[newPlace.id].setPopupContent(buildPopupHTML(newPlace));
      }
      renderPlacesList();
      renderTagFilters();
    }
  });

  renderPlacesList();
  renderTagFilters();

  // Update button to show added
  if (btn) {
    btn.textContent = 'Added';
    btn.disabled = true;
    btn.classList.add('scan-btn-added');
  }
}

function addAllScanPlaces() {
  scanFoundPlaces.forEach(function (_, index) {
    addScanPlace(index);
  });

  var addAllBtn = document.querySelector('.scan-add-all-btn');
  if (addAllBtn) {
    addAllBtn.textContent = 'All Places Added!';
    addAllBtn.disabled = true;
    addAllBtn.classList.add('scan-btn-added');
  }
}

// Manual search from the scan panel (fallback)
function scanGeoSearch() {
  var query = document.getElementById('scan-search-input').value.trim();
  if (!query) return;

  var resultsDiv = document.getElementById('scan-geo-results');
  resultsDiv.innerHTML = '<div class="loading">Searching...</div>';

  fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&q=' + encodeURIComponent(query))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      resultsDiv.innerHTML = '';
      if (data.length === 0) {
        resultsDiv.innerHTML = '<div class="loading">No results. Try editing the text above.</div>';
        return;
      }

      data.forEach(function (item) {
        var div = document.createElement('div');
        div.className = 'geo-result-item';

        var nameParts = item.display_name.split(',');
        var name = nameParts[0];
        var address = nameParts.slice(1, 4).join(',').trim();

        div.innerHTML = '<div class="result-name">' + escapeHTML(name) + '</div>'
          + '<div class="result-address">' + escapeHTML(address) + '</div>';

        div.onclick = function () {
          closeScanPanel();
          selectGeoResult(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
        };

        resultsDiv.appendChild(div);
      });
    })
    .catch(function () {
      resultsDiv.innerHTML = '<div class="loading">Search failed. Check your connection.</div>';
    });
}

// Enter key in scan search
document.getElementById('scan-search-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    scanGeoSearch();
  }
});

function closeScanPanel() {
  document.getElementById('scan-panel').classList.add('hidden');
}

// Toggle raw OCR text visibility
function toggleRawText() {
  var container = document.getElementById('scan-raw-container');
  var btn = document.getElementById('scan-raw-toggle');
  if (container.classList.contains('hidden')) {
    container.classList.remove('hidden');
    btn.textContent = 'Hide extracted text';
  } else {
    container.classList.add('hidden');
    btn.textContent = 'Show extracted text';
  }
}

// ============================================================
// REVERSE GEOCODING - Get city name for a coordinate
// ============================================================

function reverseGeocode(lat, lng, callback) {
  fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&zoom=10')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var city = '';
      if (data.address) {
        city = data.address.city || data.address.town || data.address.village
          || data.address.municipality || data.address.county || data.address.state || '';
      }
      callback(city, data.display_name || '');
    })
    .catch(function () {
      callback('', '');
    });
}

function reverseGeocodeForForm(lat, lng) {
  reverseGeocode(lat, lng, function (city, displayName) {
    if (displayName) {
      document.getElementById('form-location-preview').classList.remove('hidden');
      document.getElementById('form-location-name').textContent = displayName.split(',').slice(0, 3).join(',');
    }
  });
}

// ============================================================
// FORM - Save a place
// ============================================================

function showForm(prefillName) {
  document.getElementById('place-form').classList.remove('hidden');
  document.getElementById('place-name').value = prefillName || '';
  document.getElementById('place-desc').value = '';
  document.getElementById('place-category').value = 'default';
  document.getElementById('place-tags').value = '';
  document.getElementById('form-location-preview').classList.add('hidden');
  document.getElementById('place-name').focus();
}

function cancelForm() {
  document.getElementById('place-form').classList.add('hidden');
  document.getElementById('form-location-preview').classList.add('hidden');
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
  pendingLatLng = null;
}

function savePlace() {
  var name = document.getElementById('place-name').value.trim();
  if (!name) {
    document.getElementById('place-name').style.borderColor = '#ea4335';
    document.getElementById('place-name').focus();
    return;
  }
  document.getElementById('place-name').style.borderColor = '';

  if (!pendingLatLng) return;

  // Parse tags
  var tagsRaw = document.getElementById('place-tags').value.trim();
  var tags = [];
  if (tagsRaw) {
    tags = tagsRaw.split(',').map(function (t) { return t.trim().toLowerCase(); }).filter(function (t) { return t.length > 0; });
  }

  var place = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name,
    description: document.getElementById('place-desc').value.trim(),
    category: document.getElementById('place-category').value,
    tags: tags,
    lat: pendingLatLng.lat,
    lng: pendingLatLng.lng,
    city: '',
    createdAt: new Date().toISOString(),
  };

  places.push(place);
  persistPlaces();

  // Replace temp marker
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
  addMarkerToMap(place);

  // Hide form
  document.getElementById('place-form').classList.add('hidden');
  document.getElementById('form-location-preview').classList.add('hidden');

  // Reverse geocode to get city, then update
  reverseGeocode(place.lat, place.lng, function (city) {
    place.city = city;
    persistPlaces();
    // Update marker popup
    if (markers[place.id]) {
      markers[place.id].setPopupContent(buildPopupHTML(place));
    }
    renderPlacesList();
    renderTagFilters();
  });

  pendingLatLng = null;
  renderPlacesList();
  renderTagFilters();
}

// ============================================================
// CRUD
// ============================================================

function deletePlace(id) {
  places = places.filter(function (p) { return p.id !== id; });
  persistPlaces();

  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }

  map.closePopup();
  renderPlacesList();
  renderTagFilters();
}

function clearAllPlaces() {
  if (!confirm('Remove all saved places?')) return;
  places = [];
  persistPlaces();

  Object.keys(markers).forEach(function (id) {
    map.removeLayer(markers[id]);
  });
  markers = {};

  map.closePopup();
  activeTagFilter = null;
  renderPlacesList();
  renderTagFilters();
}

function goToPlace(id) {
  var place = places.find(function (p) { return p.id === id; });
  if (!place) return;
  map.setView([place.lat, place.lng], 16);
  if (markers[id]) {
    markers[id].openPopup();
  }
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

// ============================================================
// PERSISTENCE
// ============================================================

function persistPlaces() {
  localStorage.setItem('myPlaces', JSON.stringify(places));
}

// ============================================================
// TAG FILTERS
// ============================================================

function getAllTags() {
  var tagSet = {};
  places.forEach(function (p) {
    if (p.tags) {
      p.tags.forEach(function (t) {
        tagSet[t] = (tagSet[t] || 0) + 1;
      });
    }
  });
  // Sort by frequency
  return Object.keys(tagSet).sort(function (a, b) { return tagSet[b] - tagSet[a]; });
}

function renderTagFilters() {
  var container = document.getElementById('tag-filters');
  var allTags = getAllTags();
  container.innerHTML = '';

  allTags.forEach(function (tag) {
    var chip = document.createElement('button');
    chip.className = 'tag-filter-chip' + (activeTagFilter === tag ? ' active' : '');
    chip.textContent = tag;
    chip.onclick = function (e) {
      e.preventDefault();
      if (activeTagFilter === tag) {
        activeTagFilter = null;
      } else {
        activeTagFilter = tag;
      }
      renderTagFilters();
      renderPlacesList();
    };
    container.appendChild(chip);
  });
}

// ============================================================
// RENDER LIST - Grouped by city
// ============================================================

function renderPlacesList() {
  var list = document.getElementById('places-list');
  var emptyMsg = document.getElementById('empty-message');
  var searchText = document.getElementById('search-input').value.toLowerCase();
  list.innerHTML = '';

  // Filter
  var filtered = places.filter(function (p) {
    var matchesSearch = true;
    if (searchText) {
      matchesSearch = p.name.toLowerCase().indexOf(searchText) !== -1
        || p.description.toLowerCase().indexOf(searchText) !== -1
        || (p.city && p.city.toLowerCase().indexOf(searchText) !== -1)
        || (p.tags && p.tags.some(function (t) { return t.indexOf(searchText) !== -1; }));
    }

    var matchesTag = true;
    if (activeTagFilter) {
      matchesTag = p.tags && p.tags.indexOf(activeTagFilter) !== -1;
    }

    return matchesSearch && matchesTag;
  });

  if (places.length === 0) {
    list.innerHTML = '';
    list.appendChild(emptyMsg);
    emptyMsg.style.display = '';
    return;
  }

  if (filtered.length === 0) {
    var noResults = document.createElement('p');
    noResults.className = 'empty-msg';
    noResults.textContent = 'No places match your search.';
    list.appendChild(noResults);
    return;
  }

  // Group by city
  var groups = {};
  filtered.forEach(function (place) {
    var city = place.city || 'Unknown Location';
    if (!groups[city]) groups[city] = [];
    groups[city].push(place);
  });

  // Sort cities alphabetically, but put "Unknown Location" last
  var cityNames = Object.keys(groups).sort(function (a, b) {
    if (a === 'Unknown Location') return 1;
    if (b === 'Unknown Location') return -1;
    return a.localeCompare(b);
  });

  cityNames.forEach(function (city) {
    // City header
    var header = document.createElement('div');
    header.className = 'city-group-header';
    header.innerHTML = escapeHTML(city) + '<span class="city-count">(' + groups[city].length + ')</span>';
    list.appendChild(header);

    // Places in this city
    groups[city].forEach(function (place) {
      var item = document.createElement('div');
      item.className = 'place-item';
      item.onclick = function () { goToPlace(place.id); };

      var dot = document.createElement('div');
      dot.className = 'category-dot cat-' + (place.category || 'default');

      var info = document.createElement('div');
      info.className = 'place-info';

      var nameEl = document.createElement('div');
      nameEl.className = 'place-name';
      nameEl.textContent = place.name;

      var descEl = document.createElement('div');
      descEl.className = 'place-desc';
      descEl.textContent = place.description || categories[place.category || 'default'].label;

      info.appendChild(nameEl);
      info.appendChild(descEl);

      // Tags
      if (place.tags && place.tags.length > 0) {
        var tagsDiv = document.createElement('div');
        tagsDiv.className = 'place-tags';
        place.tags.forEach(function (tag) {
          var tagEl = document.createElement('span');
          tagEl.className = 'place-tag';
          tagEl.textContent = tag;
          tagsDiv.appendChild(tagEl);
        });
        info.appendChild(tagsDiv);
      }

      var delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.title = 'Delete place';
      delBtn.onclick = function (e) {
        e.stopPropagation();
        deletePlace(place.id);
      };

      item.appendChild(dot);
      item.appendChild(info);
      item.appendChild(delBtn);
      list.appendChild(item);
    });
  });
}

// ============================================================
// SEARCH
// ============================================================

document.getElementById('search-input').addEventListener('input', function () {
  renderPlacesList();
});

// ============================================================
// EXPORT
// ============================================================

function exportPlaces() {
  if (places.length === 0) {
    alert('No places to export.');
    return;
  }
  var data = JSON.stringify(places, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'my-places.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// MOBILE SIDEBAR
// ============================================================

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ============================================================
// UTILITY
// ============================================================

function escapeHTML(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ============================================================
// INITIALIZE
// ============================================================

// Migrate old places that don't have tags/city fields
places.forEach(function (place) {
  if (!place.tags) place.tags = [];
  if (!place.city) place.city = '';
});

// Fetch city data for any places missing it
places.forEach(function (place) {
  if (!place.city && place.lat && place.lng) {
    reverseGeocode(place.lat, place.lng, function (city) {
      if (city) {
        place.city = city;
        persistPlaces();
        if (markers[place.id]) {
          markers[place.id].setPopupContent(buildPopupHTML(place));
        }
        renderPlacesList();
      }
    });
  }
});

// Load markers
places.forEach(function (place) {
  addMarkerToMap(place);
});

renderPlacesList();
renderTagFilters();

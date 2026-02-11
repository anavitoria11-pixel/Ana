// --- Data ---
let places = JSON.parse(localStorage.getItem('myPlaces') || '[]');
let markers = {};
let tempMarker = null;
let pendingLatLng = null;

// Category configuration
const categories = {
  default: { label: 'General', color: '#4285f4' },
  food: { label: 'Food & Drink', color: '#ea4335' },
  shop: { label: 'Shopping', color: '#fbbc04' },
  nature: { label: 'Nature', color: '#34a853' },
  work: { label: 'Work', color: '#9c27b0' },
  home: { label: 'Home', color: '#ff6d00' },
};

// --- Map Setup ---
const map = L.map('map').setView([20, 0], 3);

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
    function () {
      // Default view if denied
    }
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
  var desc = place.description
    ? '<p>' + escapeHTML(place.description) + '</p>'
    : '';
  return '<div class="popup-content">'
    + '<span class="popup-category" style="background:' + cat.color + '">' + cat.label + '</span>'
    + '<h4>' + escapeHTML(place.name) + '</h4>'
    + desc
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

  // Remove previous temp marker
  if (tempMarker) {
    map.removeLayer(tempMarker);
  }

  // Place a temporary marker
  tempMarker = L.marker(e.latlng, {
    icon: createIcon('#999'),
    opacity: 0.7,
  }).addTo(map);

  // Show the form
  showForm();
});

// --- Form ---
function showForm() {
  document.getElementById('place-form').classList.remove('hidden');
  document.getElementById('place-name').value = '';
  document.getElementById('place-desc').value = '';
  document.getElementById('place-category').value = 'default';
  document.getElementById('place-name').focus();
}

function cancelForm() {
  document.getElementById('place-form').classList.add('hidden');
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

  var place = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name,
    description: document.getElementById('place-desc').value.trim(),
    category: document.getElementById('place-category').value,
    lat: pendingLatLng.lat,
    lng: pendingLatLng.lng,
    createdAt: new Date().toISOString(),
  };

  places.push(place);
  persistPlaces();

  // Replace temp marker with real one
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
  addMarkerToMap(place);

  // Hide form and refresh list
  document.getElementById('place-form').classList.add('hidden');
  pendingLatLng = null;
  renderPlacesList();
}

// --- CRUD ---
function deletePlace(id) {
  places = places.filter(function (p) { return p.id !== id; });
  persistPlaces();

  // Remove marker
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }

  map.closePopup();
  renderPlacesList();
}

function clearAllPlaces() {
  if (!confirm('Remove all saved places?')) return;
  places = [];
  persistPlaces();

  // Remove all markers
  Object.keys(markers).forEach(function (id) {
    map.removeLayer(markers[id]);
  });
  markers = {};

  map.closePopup();
  renderPlacesList();
}

function goToPlace(id) {
  var place = places.find(function (p) { return p.id === id; });
  if (!place) return;
  map.setView([place.lat, place.lng], 16);
  if (markers[id]) {
    markers[id].openPopup();
  }
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

// --- Persistence ---
function persistPlaces() {
  localStorage.setItem('myPlaces', JSON.stringify(places));
}

// --- Render list ---
function renderPlacesList(filter) {
  var list = document.getElementById('places-list');
  var emptyMsg = document.getElementById('empty-message');
  list.innerHTML = '';

  var filtered = places;
  if (filter) {
    var q = filter.toLowerCase();
    filtered = places.filter(function (p) {
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    });
  }

  if (places.length === 0) {
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

  filtered.forEach(function (place) {
    var item = document.createElement('div');
    item.className = 'place-item';
    item.onclick = function () { goToPlace(place.id); };

    var dot = document.createElement('div');
    dot.className = 'category-dot cat-' + place.category;

    var info = document.createElement('div');
    info.className = 'place-info';

    var nameEl = document.createElement('div');
    nameEl.className = 'place-name';
    nameEl.textContent = place.name;

    var descEl = document.createElement('div');
    descEl.className = 'place-desc';
    descEl.textContent = place.description || categories[place.category].label;

    var coordsEl = document.createElement('div');
    coordsEl.className = 'place-coords';
    coordsEl.textContent = place.lat.toFixed(5) + ', ' + place.lng.toFixed(5);

    info.appendChild(nameEl);
    info.appendChild(descEl);
    info.appendChild(coordsEl);

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
}

// --- Search ---
document.getElementById('search-input').addEventListener('input', function (e) {
  renderPlacesList(e.target.value);
});

// --- Export ---
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

// --- Mobile sidebar toggle ---
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// --- Utility ---
function escapeHTML(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// --- Initialize ---
// Load saved markers
places.forEach(function (place) {
  addMarkerToMap(place);
});
renderPlacesList();

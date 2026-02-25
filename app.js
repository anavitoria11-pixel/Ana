// ============================================================
// TripPlanner - Wanderlog-style Travel Planning App
// ============================================================

// --- Data ---
var trips = JSON.parse(localStorage.getItem('tripPlanner_trips') || '[]');
var currentTripId = localStorage.getItem('tripPlanner_currentTrip') || null;
var markers = {};
var routeLines = [];
var tempMarker = null;
var pendingLatLng = null;
var activeTagFilter = null;
var activeCategoryFilter = null;
var dragState = null;

// Category configuration
var categories = {
  attraction: { label: 'Attraction', color: '#4285f4', icon: '\u2B50' },
  food: { label: 'Food & Drink', color: '#ea4335', icon: '\uD83C\uDF7D\uFE0F' },
  hotel: { label: 'Hotel / Stay', color: '#9c27b0', icon: '\uD83C\uDFE8' },
  activity: { label: 'Activity', color: '#ff6d00', icon: '\uD83C\uDFC4' },
  shopping: { label: 'Shopping', color: '#fbbc04', icon: '\uD83D\uDECD\uFE0F' },
  transport: { label: 'Transport', color: '#607d8b', icon: '\u2708\uFE0F' },
  nature: { label: 'Nature', color: '#34a853', icon: '\uD83C\uDF3F' },
  nightlife: { label: 'Nightlife', color: '#e91e63', icon: '\uD83C\uDF19' },
  other: { label: 'Other', color: '#795548', icon: '\uD83D\uDCCC' },
};

// Day colors for route lines
var dayColors = ['#4285f4', '#ea4335', '#34a853', '#fbbc04', '#9c27b0', '#ff6d00', '#00bcd4', '#e91e63', '#607d8b', '#795548'];

// --- Map Setup ---
var map = L.map('map').setView([20, 0], 3);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}).addTo(map);

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      if (!currentTripId) {
        map.setView([pos.coords.latitude, pos.coords.longitude], 13);
      }
    },
    function () {}
  );
}

// --- Helper: Get current trip ---
function getCurrentTrip() {
  if (!currentTripId) return null;
  return trips.find(function (t) { return t.id === currentTripId; }) || null;
}

function getPlaces() {
  var trip = getCurrentTrip();
  return trip ? trip.places : [];
}

function getExpenses() {
  var trip = getCurrentTrip();
  return trip ? (trip.expenses || []) : [];
}

function getBookings() {
  var trip = getCurrentTrip();
  return trip ? (trip.bookings || []) : [];
}

// --- Marker helpers ---
function createIcon(color, label) {
  var labelHTML = label ? '<text x="14" y="18" text-anchor="middle" fill="' + color + '" font-size="10" font-weight="bold" font-family="sans-serif">' + label + '</text>' : '<circle cx="14" cy="14" r="6" fill="#fff"/>';
  return L.divIcon({
    className: 'custom-marker',
    html: '<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="' + color + '"/>'
      + labelHTML
      + '</svg>',
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

function buildPopupHTML(place) {
  var cat = categories[place.category] || categories.other;
  var desc = place.description ? '<p>' + escapeHTML(place.description) + '</p>' : '';

  var tagsHTML = '';
  if (place.tags && place.tags.length > 0) {
    tagsHTML = '<div class="popup-tags">'
      + place.tags.map(function (t) { return '<span class="place-tag">' + escapeHTML(t) + '</span>'; }).join(' ')
      + '</div>';
  }

  var costHTML = place.cost ? '<div class="popup-cost">$' + parseFloat(place.cost).toFixed(2) + '</div>' : '';
  var durationHTML = place.duration ? '<div class="popup-duration">' + formatDuration(place.duration) + '</div>' : '';
  var dayHTML = '';
  if (place.dayIndex !== undefined && place.dayIndex !== null && place.dayIndex !== '') {
    var trip = getCurrentTrip();
    if (trip) {
      dayHTML = '<div class="popup-day">Day ' + (parseInt(place.dayIndex) + 1) + '</div>';
    }
  }

  return '<div class="popup-content">'
    + '<span class="popup-category" style="background:' + cat.color + '">' + cat.icon + ' ' + cat.label + '</span>'
    + '<h4>' + escapeHTML(place.name) + '</h4>'
    + desc
    + dayHTML
    + costHTML
    + durationHTML
    + tagsHTML
    + '<div class="popup-actions">'
    + '<button onclick="editPlaceFromPopup(\'' + place.id + '\')">Edit</button>'
    + '<button class="secondary" onclick="deletePlace(\'' + place.id + '\')">Delete</button>'
    + '</div>'
    + '</div>';
}

function addMarkerToMap(place) {
  var cat = categories[place.category] || categories.other;
  var label = '';
  if (place.dayIndex !== undefined && place.dayIndex !== null && place.dayIndex !== '') {
    var dayPlaces = getPlaces().filter(function (p) { return p.dayIndex === place.dayIndex; });
    var orderInDay = dayPlaces.indexOf(place);
    if (orderInDay === -1) {
      // find by id
      for (var i = 0; i < dayPlaces.length; i++) {
        if (dayPlaces[i].id === place.id) { orderInDay = i; break; }
      }
    }
    label = (parseInt(place.dayIndex) + 1) + '.' + (orderInDay + 1);
  }
  var marker = L.marker([place.lat, place.lng], {
    icon: createIcon(cat.color, label),
  }).addTo(map);

  marker.bindPopup(buildPopupHTML(place));
  markers[place.id] = marker;
}

// --- Map click handler ---
map.on('click', function (e) {
  if (!currentTripId) {
    alert('Create a trip first to start adding places!');
    return;
  }
  pendingLatLng = e.latlng;

  if (tempMarker) {
    map.removeLayer(tempMarker);
  }

  tempMarker = L.marker(e.latlng, {
    icon: createIcon('#999'),
    opacity: 0.7,
  }).addTo(map);

  switchTab('places');
  showForm();
  reverseGeocodeForForm(e.latlng.lat, e.latlng.lng);
});

// ============================================================
// TRIP MANAGEMENT
// ============================================================

function toggleTripsMenu() {
  var menu = document.getElementById('trips-menu');
  menu.classList.toggle('hidden');
  if (!menu.classList.contains('hidden')) {
    renderTripsList();
  }
}

function renderTripsList() {
  var list = document.getElementById('trips-list');
  list.innerHTML = '';

  if (trips.length === 0) {
    list.innerHTML = '<div class="empty-msg" style="padding:1rem;">No trips yet. Create your first trip!</div>';
    return;
  }

  trips.forEach(function (trip) {
    var item = document.createElement('div');
    item.className = 'trip-item' + (trip.id === currentTripId ? ' active' : '');

    var dateStr = '';
    if (trip.startDate) {
      dateStr = formatDate(trip.startDate);
      if (trip.endDate) dateStr += ' - ' + formatDate(trip.endDate);
    }

    item.innerHTML = '<div class="trip-item-info">'
      + '<div class="trip-item-name">' + escapeHTML(trip.name) + '</div>'
      + '<div class="trip-item-dest">' + escapeHTML(trip.destination || '') + '</div>'
      + (dateStr ? '<div class="trip-item-dates">' + dateStr + '</div>' : '')
      + '<div class="trip-item-stats">' + (trip.places ? trip.places.length : 0) + ' places</div>'
      + '</div>'
      + '<div class="trip-item-actions">'
      + '<button class="icon-btn small" onclick="event.stopPropagation(); editTrip(\'' + trip.id + '\')" title="Edit">&#9998;</button>'
      + '<button class="icon-btn small danger" onclick="event.stopPropagation(); deleteTripConfirm(\'' + trip.id + '\')" title="Delete">&#128465;</button>'
      + '</div>';

    item.onclick = function () {
      selectTrip(trip.id);
      toggleTripsMenu();
    };

    list.appendChild(item);
  });
}

function showNewTripForm() {
  document.getElementById('trips-menu').classList.add('hidden');
  document.getElementById('trip-form').classList.remove('hidden');
  document.getElementById('trip-form-title').textContent = 'New Trip';
  document.getElementById('trip-name').value = '';
  document.getElementById('trip-destination').value = '';
  document.getElementById('trip-start').value = '';
  document.getElementById('trip-end').value = '';
  document.getElementById('trip-budget').value = '';
  document.getElementById('trip-notes').value = '';
  document.getElementById('trip-form').removeAttribute('data-edit-id');
  document.getElementById('trip-name').focus();
}

function editTrip(tripId) {
  var trip = trips.find(function (t) { return t.id === tripId; });
  if (!trip) return;

  document.getElementById('trips-menu').classList.add('hidden');
  document.getElementById('trip-form').classList.remove('hidden');
  document.getElementById('trip-form-title').textContent = 'Edit Trip';
  document.getElementById('trip-name').value = trip.name;
  document.getElementById('trip-destination').value = trip.destination || '';
  document.getElementById('trip-start').value = trip.startDate || '';
  document.getElementById('trip-end').value = trip.endDate || '';
  document.getElementById('trip-budget').value = trip.budget || '';
  document.getElementById('trip-notes').value = trip.notes || '';
  document.getElementById('trip-form').setAttribute('data-edit-id', tripId);
}

function saveTrip() {
  var name = document.getElementById('trip-name').value.trim();
  if (!name) {
    document.getElementById('trip-name').style.borderColor = '#ea4335';
    return;
  }
  document.getElementById('trip-name').style.borderColor = '';

  var editId = document.getElementById('trip-form').getAttribute('data-edit-id');

  if (editId) {
    var trip = trips.find(function (t) { return t.id === editId; });
    if (trip) {
      trip.name = name;
      trip.destination = document.getElementById('trip-destination').value.trim();
      trip.startDate = document.getElementById('trip-start').value;
      trip.endDate = document.getElementById('trip-end').value;
      trip.budget = parseFloat(document.getElementById('trip-budget').value) || 0;
      trip.notes = document.getElementById('trip-notes').value.trim();
    }
  } else {
    var newTrip = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: name,
      destination: document.getElementById('trip-destination').value.trim(),
      startDate: document.getElementById('trip-start').value,
      endDate: document.getElementById('trip-end').value,
      budget: parseFloat(document.getElementById('trip-budget').value) || 0,
      notes: document.getElementById('trip-notes').value.trim(),
      places: [],
      expenses: [],
      bookings: [],
      createdAt: new Date().toISOString(),
    };
    trips.push(newTrip);
    selectTrip(newTrip.id);
  }

  persistTrips();
  cancelTripForm();
  updateTripHeader();
  refreshAll();
}

function cancelTripForm() {
  document.getElementById('trip-form').classList.add('hidden');
  document.getElementById('trip-form').removeAttribute('data-edit-id');
}

function deleteTripConfirm(tripId) {
  if (!confirm('Delete this trip and all its places?')) return;
  trips = trips.filter(function (t) { return t.id !== tripId; });
  if (currentTripId === tripId) {
    currentTripId = trips.length > 0 ? trips[0].id : null;
  }
  persistTrips();
  clearAllMarkers();
  updateTripHeader();
  refreshAll();
  renderTripsList();
}

function selectTrip(tripId) {
  currentTripId = tripId;
  localStorage.setItem('tripPlanner_currentTrip', tripId);
  clearAllMarkers();
  updateTripHeader();
  loadTripOnMap();
  refreshAll();
}

function updateTripHeader() {
  var trip = getCurrentTrip();
  var titleEl = document.getElementById('app-title');
  var infoEl = document.getElementById('current-trip-info');
  var tabBar = document.getElementById('tab-bar');
  var footer = document.getElementById('sidebar-footer');

  if (trip) {
    titleEl.textContent = trip.name;
    infoEl.classList.remove('hidden');
    tabBar.classList.remove('hidden');
    footer.classList.remove('hidden');

    var dateStr = '';
    if (trip.startDate) {
      dateStr = formatDate(trip.startDate);
      if (trip.endDate) dateStr += ' \u2014 ' + formatDate(trip.endDate);
    }
    document.getElementById('trip-dates-display').textContent = dateStr;
    document.getElementById('trip-dest-display').textContent = trip.destination || '';

    // Show default tab
    switchTab('itinerary');
  } else {
    titleEl.textContent = 'TripPlanner';
    infoEl.classList.add('hidden');
    tabBar.classList.add('hidden');
    footer.classList.add('hidden');
    hideAllTabs();
  }
}

// ============================================================
// TAB MANAGEMENT
// ============================================================

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  // Show correct content
  document.querySelectorAll('.tab-content').forEach(function (el) {
    el.classList.add('hidden');
  });
  var target = document.getElementById('tab-' + tabName);
  if (target) target.classList.remove('hidden');

  // Refresh the tab's content
  if (tabName === 'itinerary') renderItinerary();
  else if (tabName === 'places') { renderPlacesList(); renderCategoryFilters(); }
  else if (tabName === 'budget') renderBudget();
  else if (tabName === 'notes') renderNotes();
}

function hideAllTabs() {
  document.querySelectorAll('.tab-content').forEach(function (el) {
    el.classList.add('hidden');
  });
}

// ============================================================
// ITINERARY TAB - Day-by-day view
// ============================================================

function getTripDays() {
  var trip = getCurrentTrip();
  if (!trip || !trip.startDate || !trip.endDate) return [];

  var days = [];
  var start = new Date(trip.startDate + 'T00:00:00');
  var end = new Date(trip.endDate + 'T00:00:00');
  var d = new Date(start);
  var index = 0;

  while (d <= end) {
    days.push({
      index: index,
      date: new Date(d),
      label: 'Day ' + (index + 1),
      dateStr: formatDate(d.toISOString().split('T')[0]),
    });
    d.setDate(d.getDate() + 1);
    index++;
  }
  return days;
}

function renderItinerary() {
  var container = document.getElementById('itinerary-days');
  container.innerHTML = '';

  var trip = getCurrentTrip();
  if (!trip) return;

  var days = getTripDays();
  var places = getPlaces();

  if (days.length === 0) {
    container.innerHTML = '<div class="empty-msg">Set trip dates to organize your itinerary by day.</div>';
    // Still show all places as unassigned
    renderUnassignedPlaces(places);
    return;
  }

  days.forEach(function (day) {
    var dayPlaces = places.filter(function (p) {
      return p.dayIndex !== undefined && p.dayIndex !== null && parseInt(p.dayIndex) === day.index;
    }).sort(function (a, b) { return (a.orderInDay || 0) - (b.orderInDay || 0); });

    var dayDiv = document.createElement('div');
    dayDiv.className = 'day-section';
    dayDiv.setAttribute('data-day', day.index);

    var color = dayColors[day.index % dayColors.length];

    var totalCost = dayPlaces.reduce(function (sum, p) { return sum + (parseFloat(p.cost) || 0); }, 0);
    var totalDuration = dayPlaces.reduce(function (sum, p) { return sum + (parseInt(p.duration) || 0); }, 0);

    dayDiv.innerHTML = '<div class="day-header" onclick="toggleDay(' + day.index + ')" style="border-left: 4px solid ' + color + '">'
      + '<div class="day-header-info">'
      + '<span class="day-label">' + day.label + '</span>'
      + '<span class="day-date">' + day.dateStr + '</span>'
      + '</div>'
      + '<div class="day-header-stats">'
      + '<span class="day-places-count">' + dayPlaces.length + ' places</span>'
      + (totalCost > 0 ? '<span class="day-cost">$' + totalCost.toFixed(0) + '</span>' : '')
      + (totalDuration > 0 ? '<span class="day-duration">' + formatDuration(totalDuration) + '</span>' : '')
      + '</div>'
      + '<span class="day-chevron" id="chevron-' + day.index + '">\u25BC</span>'
      + '</div>';

    var placesContainer = document.createElement('div');
    placesContainer.className = 'day-places';
    placesContainer.id = 'day-places-' + day.index;
    placesContainer.setAttribute('data-day', day.index);

    // Drop zone
    placesContainer.ondragover = function (e) { e.preventDefault(); placesContainer.classList.add('drag-over'); };
    placesContainer.ondragleave = function () { placesContainer.classList.remove('drag-over'); };
    placesContainer.ondrop = function (e) {
      e.preventDefault();
      placesContainer.classList.remove('drag-over');
      handleDrop(day.index);
    };

    if (dayPlaces.length === 0) {
      placesContainer.innerHTML = '<div class="day-empty">Drag places here or click + Add Place</div>';
    } else {
      dayPlaces.forEach(function (place, idx) {
        placesContainer.appendChild(createItineraryItem(place, idx, day.index));
      });
    }

    dayDiv.appendChild(placesContainer);
    container.appendChild(dayDiv);
  });

  // Unassigned places
  var unassigned = places.filter(function (p) {
    return p.dayIndex === undefined || p.dayIndex === null || p.dayIndex === '';
  });
  renderUnassignedPlaces(unassigned);

  // Draw route lines
  drawRouteLines();
}

function createItineraryItem(place, index, dayIndex) {
  var cat = categories[place.category] || categories.other;
  var item = document.createElement('div');
  item.className = 'itinerary-item';
  item.draggable = true;
  item.setAttribute('data-place-id', place.id);

  item.ondragstart = function (e) {
    dragState = { placeId: place.id };
    e.dataTransfer.effectAllowed = 'move';
    item.classList.add('dragging');
  };
  item.ondragend = function () {
    item.classList.remove('dragging');
    dragState = null;
  };

  var costStr = place.cost ? '$' + parseFloat(place.cost).toFixed(0) : '';
  var durStr = place.duration ? formatDuration(place.duration) : '';

  item.innerHTML = '<div class="itinerary-drag-handle">\u2630</div>'
    + '<div class="itinerary-number" style="background:' + cat.color + '">' + (index + 1) + '</div>'
    + '<div class="itinerary-info">'
    + '<div class="itinerary-name">' + escapeHTML(place.name) + '</div>'
    + '<div class="itinerary-meta">'
    + '<span class="itinerary-cat">' + cat.icon + ' ' + cat.label + '</span>'
    + (durStr ? '<span class="itinerary-dur">' + durStr + '</span>' : '')
    + (costStr ? '<span class="itinerary-cost">' + costStr + '</span>' : '')
    + '</div>'
    + '</div>'
    + '<div class="itinerary-actions">'
    + '<button class="icon-btn small" onclick="event.stopPropagation(); movePlace(\'' + place.id + '\', -1)" title="Move up">\u25B2</button>'
    + '<button class="icon-btn small" onclick="event.stopPropagation(); movePlace(\'' + place.id + '\', 1)" title="Move down">\u25BC</button>'
    + '<button class="icon-btn small" onclick="event.stopPropagation(); unassignPlace(\'' + place.id + '\')" title="Unassign">\u2716</button>'
    + '</div>';

  item.onclick = function () { goToPlace(place.id); };

  return item;
}

function renderUnassignedPlaces(unassigned) {
  var container = document.getElementById('unassigned-places');
  container.innerHTML = '';

  container.ondragover = function (e) { e.preventDefault(); container.classList.add('drag-over'); };
  container.ondragleave = function () { container.classList.remove('drag-over'); };
  container.ondrop = function (e) {
    e.preventDefault();
    container.classList.remove('drag-over');
    handleDrop(null);
  };

  if (unassigned.length === 0) {
    container.innerHTML = '<div class="day-empty">No unassigned places</div>';
    return;
  }

  unassigned.forEach(function (place) {
    var cat = categories[place.category] || categories.other;
    var item = document.createElement('div');
    item.className = 'itinerary-item unassigned';
    item.draggable = true;
    item.setAttribute('data-place-id', place.id);

    item.ondragstart = function (e) {
      dragState = { placeId: place.id };
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging');
    };
    item.ondragend = function () {
      item.classList.remove('dragging');
      dragState = null;
    };

    var days = getTripDays();
    var dayOptions = days.map(function (d) {
      return '<option value="' + d.index + '">Day ' + (d.index + 1) + '</option>';
    }).join('');

    item.innerHTML = '<div class="itinerary-drag-handle">\u2630</div>'
      + '<div class="itinerary-number" style="background:' + cat.color + '">' + cat.icon + '</div>'
      + '<div class="itinerary-info">'
      + '<div class="itinerary-name">' + escapeHTML(place.name) + '</div>'
      + '<div class="itinerary-meta">'
      + '<span class="itinerary-cat">' + cat.label + '</span>'
      + '</div>'
      + '</div>'
      + '<select class="assign-day-select" onchange="assignPlaceToDay(\'' + place.id + '\', this.value); event.stopPropagation();">'
      + '<option value="">Assign...</option>'
      + dayOptions
      + '</select>';

    item.onclick = function () { goToPlace(place.id); };

    container.appendChild(item);
  });
}

function handleDrop(dayIndex) {
  if (!dragState) return;
  var places = getPlaces();
  var place = places.find(function (p) { return p.id === dragState.placeId; });
  if (!place) return;

  if (dayIndex === null) {
    place.dayIndex = undefined;
    place.orderInDay = undefined;
  } else {
    place.dayIndex = dayIndex;
    var dayPlaces = places.filter(function (p) { return p.dayIndex === dayIndex && p.id !== place.id; });
    place.orderInDay = dayPlaces.length;
  }

  persistTrips();
  refreshAll();
}

function toggleDay(dayIndex) {
  var container = document.getElementById('day-places-' + dayIndex);
  var chevron = document.getElementById('chevron-' + dayIndex);
  if (container) {
    container.classList.toggle('collapsed');
    if (chevron) {
      chevron.innerHTML = container.classList.contains('collapsed') ? '\u25B6' : '\u25BC';
    }
  }
}

function toggleUnassigned() {
  var container = document.getElementById('unassigned-places');
  var chevron = document.getElementById('unassigned-chevron');
  if (container) {
    container.classList.toggle('collapsed');
    if (chevron) {
      chevron.innerHTML = container.classList.contains('collapsed') ? '\u25B6' : '\u25BC';
    }
  }
}

function assignPlaceToDay(placeId, dayIndex) {
  var places = getPlaces();
  var place = places.find(function (p) { return p.id === placeId; });
  if (!place) return;

  if (dayIndex === '' || dayIndex === null) {
    place.dayIndex = undefined;
    place.orderInDay = undefined;
  } else {
    place.dayIndex = parseInt(dayIndex);
    var dayPlaces = places.filter(function (p) { return p.dayIndex === parseInt(dayIndex) && p.id !== placeId; });
    place.orderInDay = dayPlaces.length;
  }

  persistTrips();
  refreshAll();
}

function movePlace(placeId, direction) {
  var places = getPlaces();
  var place = places.find(function (p) { return p.id === placeId; });
  if (!place || place.dayIndex === undefined) return;

  var dayPlaces = places.filter(function (p) { return p.dayIndex === place.dayIndex; })
    .sort(function (a, b) { return (a.orderInDay || 0) - (b.orderInDay || 0); });

  var idx = dayPlaces.findIndex(function (p) { return p.id === placeId; });
  var newIdx = idx + direction;

  if (newIdx < 0 || newIdx >= dayPlaces.length) return;

  // Swap order
  var temp = dayPlaces[idx].orderInDay;
  dayPlaces[idx].orderInDay = dayPlaces[newIdx].orderInDay;
  dayPlaces[newIdx].orderInDay = temp;

  persistTrips();
  refreshAll();
}

function unassignPlace(placeId) {
  var places = getPlaces();
  var place = places.find(function (p) { return p.id === placeId; });
  if (!place) return;

  place.dayIndex = undefined;
  place.orderInDay = undefined;
  persistTrips();
  refreshAll();
}

function showAddPlaceOptions() {
  document.getElementById('add-place-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('add-place-modal').classList.add('hidden');
}

// Optimize route for a day (simple nearest-neighbor)
function optimizeDay() {
  var trip = getCurrentTrip();
  if (!trip) return;

  var days = getTripDays();
  days.forEach(function (day) {
    var dayPlaces = trip.places.filter(function (p) { return parseInt(p.dayIndex) === day.index; });
    if (dayPlaces.length < 3) return;

    // Nearest-neighbor heuristic
    var remaining = dayPlaces.slice();
    var ordered = [remaining.shift()];

    while (remaining.length > 0) {
      var last = ordered[ordered.length - 1];
      var nearest = null;
      var nearestDist = Infinity;

      remaining.forEach(function (p) {
        var d = haversine(last.lat, last.lng, p.lat, p.lng);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = p;
        }
      });

      remaining = remaining.filter(function (p) { return p.id !== nearest.id; });
      ordered.push(nearest);
    }

    ordered.forEach(function (p, i) { p.orderInDay = i; });
  });

  persistTrips();
  refreshAll();
}

// Haversine distance in km
function haversine(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// ROUTE LINES - Connect places on the same day
// ============================================================

function drawRouteLines() {
  // Clear existing
  routeLines.forEach(function (line) { map.removeLayer(line); });
  routeLines = [];

  var trip = getCurrentTrip();
  if (!trip) return;

  var days = getTripDays();
  days.forEach(function (day) {
    var dayPlaces = trip.places.filter(function (p) {
      return p.dayIndex !== undefined && parseInt(p.dayIndex) === day.index;
    }).sort(function (a, b) { return (a.orderInDay || 0) - (b.orderInDay || 0); });

    if (dayPlaces.length < 2) return;

    var coords = dayPlaces.map(function (p) { return [p.lat, p.lng]; });
    var color = dayColors[day.index % dayColors.length];

    var line = L.polyline(coords, {
      color: color,
      weight: 3,
      opacity: 0.7,
      dashArray: '8, 8',
    }).addTo(map);

    routeLines.push(line);
  });
}

// ============================================================
// TEXT SEARCH
// ============================================================

function showTextSearch() {
  if (!currentTripId) { alert('Create a trip first!'); return; }
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
        resultsDiv.innerHTML = '<div class="loading">No results found.</div>';
        return;
      }
      data.forEach(function (item) {
        var div = document.createElement('div');
        div.className = 'geo-result-item';
        var nameParts = item.display_name.split(',');
        div.innerHTML = '<div class="result-name">' + escapeHTML(nameParts[0]) + '</div>'
          + '<div class="result-address">' + escapeHTML(nameParts.slice(1, 4).join(',').trim()) + '</div>';
        div.onclick = function () {
          selectGeoResult(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
        };
        resultsDiv.appendChild(div);
      });
    })
    .catch(function () {
      resultsDiv.innerHTML = '<div class="loading">Search failed.</div>';
    });
}

document.getElementById('geo-search-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); geoSearch(); }
});

function selectGeoResult(lat, lng, displayName) {
  closeTextSearch();
  pendingLatLng = { lat: lat, lng: lng };

  if (tempMarker) map.removeLayer(tempMarker);
  tempMarker = L.marker([lat, lng], { icon: createIcon('#999'), opacity: 0.7 }).addTo(map);
  map.setView([lat, lng], 15);

  var shortName = displayName.split(',')[0];
  showForm(shortName);
  document.getElementById('form-location-preview').classList.remove('hidden');
  document.getElementById('form-location-name').textContent = displayName.split(',').slice(0, 3).join(',');
}

// ============================================================
// IMAGE SCAN
// ============================================================

var userProvidedContext = '';

function triggerPhotoUpload() {
  if (!currentTripId) { alert('Create a trip first!'); return; }
  document.getElementById('scan-context-prompt').classList.remove('hidden');
  document.getElementById('scan-context-input').value = '';
  document.getElementById('scan-context-input').focus();
}

function startScanWithContext() {
  userProvidedContext = document.getElementById('scan-context-input').value.trim();
  document.getElementById('scan-context-prompt').classList.add('hidden');
  document.getElementById('photo-input').click();
}

// (All AI text interpretation functions from original app kept intact)

function detectLocationContext(text) {
  var contexts = [];
  var inPatterns = /(?:^|\b)(?:in|of|near|around|across|throughout|visiting|explore|exploring)\s+([A-Z][A-Za-z\u00C0-\u00FF\s\-\.]+)/gim;
  var m;
  while ((m = inPatterns.exec(text)) !== null) {
    var loc = m[1].trim().replace(/[.!?,;:]+$/, '').trim();
    if (loc.length >= 3 && loc.length <= 50 && !isNoiseLine(loc)) contexts.push(loc);
  }

  var possessivePattern = /([A-Z][A-Za-z\u00C0-\u00FF\s\-\.]+?)(?:'s|'s)\s+(?:best|top|favorite|favourite|greatest|finest|popular|famous|hidden|must|essential)/gi;
  while ((m = possessivePattern.exec(text)) !== null) {
    var loc2 = m[1].trim();
    if (loc2.length >= 3 && loc2.length <= 50 && !isNoiseLine(loc2)) contexts.push(loc2);
  }

  var headerPattern = /(?:best|top|must|favorite|favourite|popular|famous|hidden|essential|amazing|incredible|great)\s+(?:[\w\s]+?)\s+(?:in|of|near|around)\s+([A-Z][A-Za-z\u00C0-\u00FF\s\-\.]+)/gi;
  while ((m = headerPattern.exec(text)) !== null) {
    var loc3 = m[1].trim().replace(/[.!?,;:]+$/, '').trim();
    if (loc3.length >= 3 && loc3.length <= 50 && !isNoiseLine(loc3)) contexts.push(loc3);
  }

  var knownLocations = [
    'New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami', 'Seattle', 'Boston',
    'London', 'Paris', 'Rome', 'Barcelona', 'Madrid', 'Berlin', 'Amsterdam', 'Prague',
    'Vienna', 'Lisbon', 'Athens', 'Istanbul', 'Dublin', 'Edinburgh', 'Copenhagen',
    'Tokyo', 'Kyoto', 'Osaka', 'Seoul', 'Bangkok', 'Singapore', 'Hong Kong', 'Taipei',
    'Sydney', 'Melbourne', 'Auckland', 'Toronto', 'Vancouver', 'Montreal',
    'Mexico City', 'Buenos Aires', 'Rio de Janeiro', 'Lima', 'Dubai', 'Mumbai',
    'Cape Town', 'Marrakech', 'Cairo', 'Nairobi',
    'Italy', 'France', 'Spain', 'Germany', 'Japan', 'Thailand', 'Portugal', 'Greece',
    'Hawaii', 'California', 'Bali',
  ];

  knownLocations.forEach(function (loc) {
    var pattern = new RegExp('\\b' + loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (pattern.test(text)) contexts.push(loc);
  });

  var unique = [];
  var seenLower = {};
  var cuisineWords = /^(thai|indian|chinese|japanese|korean|italian|french|mexican|spanish|greek|turkish|vietnamese|ethiopian|moroccan|lebanese|persian|american|british|german|brazilian|peruvian|cuban|african|asian|european|mediterranean)$/i;
  contexts.forEach(function (c) {
    var key = c.toLowerCase().trim();
    if (cuisineWords.test(key)) return;
    if (!seenLower[key]) { seenLower[key] = true; unique.push(c); }
  });
  return unique;
}

function isNoiseLine(text) {
  var noisePatterns = [
    /^(menu|price|total|subtotal|tax|tip|receipt|order|qty|item|date|time|thank|welcome|enjoy|please|www\.|http|@|#\d)/i,
    /^\d+[\.\,]\d{2}$/, /^\$[\d\.\,]+$/, /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,
    /^\d{1,2}:\d{2}/, /^tel|^phone|^fax|^email/i, /^\d+$/, /^[^a-zA-Z\u00C0-\u00FF]*$/,
    /\b(click|tap|swipe|login|sign in|password|subscribe|follow us|share|download|upload|settings|profile|account|cancel|confirm)\b/i,
  ];
  for (var i = 0; i < noisePatterns.length; i++) {
    if (noisePatterns[i].test(text)) return true;
  }
  return false;
}

function extractPlaceCandidates(text) {
  var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 2; });
  var locationContexts = detectLocationContext(text);
  var bestContext = userProvidedContext || (locationContexts.length > 0 ? locationContexts[0] : '');
  var candidates = [];
  var seen = {};

  lines.forEach(function (line) {
    var cleaned = line.replace(/[|}{[\]\\]/g, '').replace(/\s{2,}/g, ' ').trim();
    if (cleaned.length < 3 || cleaned.length > 120) return;
    if (isNoiseLine(cleaned)) return;

    var stripped = cleaned
      .replace(/^[\d]+[\.\)]\s*/, '')
      .replace(/^[\u2022\-\*\#\>\u2192\u25BA]+\s*/, '')
      .replace(/^#\d+\s*[\.\:\-]?\s*/, '')
      .trim();

    if (stripped.length < 3) return;
    var placeName = stripped.split(/\s[\-\|\u2014\u2013]\s/)[0].trim();

    if (/^[A-Z\u00C0-\u00FF]/.test(placeName) && placeName.indexOf(':') > 3) {
      var beforeColon = placeName.split(':')[0].trim();
      if (beforeColon.length >= 3 && beforeColon.length <= 60) placeName = beforeColon;
    }

    placeName = placeName
      .replace(/\s*[\(\uFF08][\d\.]+[\)\uFF09]\s*$/, '')
      .replace(/\s*[\u2605\u2606\u2729\u272D\u2B50]+\s*$/, '')
      .replace(/\s*\d+(\.\d+)?\s*stars?\s*$/i, '')
      .trim();

    if (placeName.length < 3 || placeName.length > 80) return;
    var score = scorePlaceCandidate(placeName, cleaned);
    if (score >= 0) {
      var key = placeName.toLowerCase();
      if (!seen[key]) { seen[key] = true; candidates.push({ text: placeName, score: score, originalLine: cleaned }); }
    }
  });

  candidates.sort(function (a, b) { return b.score - a.score; });
  candidates = candidates.slice(0, 12);
  candidates.forEach(function (c) { c.locationContext = bestContext; c.allContexts = locationContexts; });
  return candidates;
}

function scorePlaceCandidate(text, fullLine) {
  var score = 1;
  if (/^[A-Z\u00C0-\u00FF]/.test(text)) score += 2;
  var capsWords = text.match(/[A-Z\u00C0-\u00FF][a-zA-Z\u00C0-\u00FF]+/g);
  if (capsWords && capsWords.length >= 2) score += 2;
  if (/\b(restaurant|cafe|caf\u00E9|bar|pub|bistro|trattoria|osteria|bakery|diner|grill|sushi|ramen|pizzeria)\b/i.test(fullLine || text)) score += 3;
  if (/\b(hotel|hostel|inn|resort|lodge|motel|guesthouse)\b/i.test(fullLine || text)) score += 3;
  if (/\b(park|museum|gallery|church|cathedral|temple|theater|theatre|stadium|zoo|aquarium|garden|monument|castle|palace|tower|bridge)\b/i.test(fullLine || text)) score += 3;
  if (/\b(market|bazaar|mall|shop|store|boutique|bookstore)\b/i.test(fullLine || text)) score += 3;
  if (/\b(beach|lake|mountain|trail|waterfall|canyon|island|bay|pier|viewpoint)\b/i.test(fullLine || text)) score += 3;
  if (/\d{1,5}\s+[A-Z]/.test(text)) score += 3;
  if (/\b(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|place)\b\.?/i.test(text)) score += 3;
  var wordCount = text.split(/\s+/).length;
  if (wordCount >= 1 && wordCount <= 5 && /^[A-Z\u00C0-\u00FF]/.test(text)) score += 2;
  if (/[\u00C0-\u00FF]/.test(text)) score += 1;
  if (/\b(click|tap|swipe|login|sign|password|email|subscribe|follow|share|download|settings|profile|account|cancel|confirm|ok|yes|no|read more|see more|view|load|save|edit|delete|back|next|home|about|contact)\b/i.test(text)) score -= 8;
  if (wordCount > 8) score -= 3;
  if (text.length > 60) score -= 2;
  return score;
}

function geocodeCandidate(candidate) {
  var query = candidate.text;
  if (candidate.locationContext) query = candidate.text + ', ' + candidate.locationContext;

  return fetch('https://nominatim.openstreetmap.org/search?format=json&limit=3&q=' + encodeURIComponent(query))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.length > 0) {
        var best = data[0];
        for (var i = 0; i < data.length; i++) {
          var cls = (data[i].class || '').toLowerCase();
          if (cls === 'amenity' || cls === 'tourism' || cls === 'shop' || cls === 'leisure') { best = data[i]; break; }
        }
        return {
          query: candidate.text, searchQuery: query, score: candidate.score,
          lat: parseFloat(best.lat), lng: parseFloat(best.lon),
          displayName: best.display_name, name: best.display_name.split(',')[0],
          address: best.display_name.split(',').slice(1, 4).join(',').trim(),
          context: candidate.locationContext || ''
        };
      }
      if (candidate.locationContext) {
        return fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(candidate.text))
          .then(function (res) { return res.json(); })
          .then(function (data2) {
            if (data2 && data2.length > 0) {
              return {
                query: candidate.text, searchQuery: candidate.text, score: candidate.score,
                lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon),
                displayName: data2[0].display_name, name: data2[0].display_name.split(',')[0],
                address: data2[0].display_name.split(',').slice(1, 4).join(',').trim(), context: ''
              };
            }
            return null;
          });
      }
      return null;
    })
    .catch(function () { return null; });
}

function geocodeCandidatesSequentially(candidates, onProgress) {
  var results = [];
  var index = 0;
  var total = candidates.length;

  return new Promise(function (resolve) {
    function next() {
      if (index >= candidates.length) { resolve(results); return; }
      var candidate = candidates[index];
      index++;
      if (onProgress) onProgress(index, total);

      geocodeCandidate(candidate).then(function (result) {
        if (result) {
          var isDupe = results.some(function (r) {
            return Math.abs(r.lat - result.lat) < 0.0005 && Math.abs(r.lng - result.lng) < 0.0005;
          });
          if (!isDupe) { results.push(result); renderScanFoundPlaces(results); }
        }
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

  panel.classList.remove('hidden');
  resultsDiv.classList.add('hidden');
  title.textContent = 'Scanning image for text...';
  progressFill.style.width = '10%';
  document.getElementById('scan-progress').classList.remove('hidden');
  scanFoundPlaces = [];

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
      return;
    }

    title.textContent = 'Analyzing text for places...';
    var candidates = extractPlaceCandidates(text);
    var contextInfo = (candidates.length > 0 && candidates[0].locationContext) ? ' (near ' + candidates[0].locationContext + ')' : '';

    if (candidates.length === 0) {
      title.textContent = 'No place names detected. Try manual search below.';
      progressFill.style.width = '100%';
      document.getElementById('scan-progress').classList.add('hidden');
      resultsDiv.classList.remove('hidden');
      document.getElementById('scan-found-places').innerHTML = '';
      document.getElementById('scan-raw-text').textContent = text;
      return;
    }

    title.textContent = 'Found ' + candidates.length + ' potential places' + contextInfo + '. Looking them up...';
    resultsDiv.classList.remove('hidden');
    document.getElementById('scan-found-places').innerHTML = '<div class="loading">Searching for locations...</div>';
    document.getElementById('scan-raw-text').textContent = text;

    geocodeCandidatesSequentially(candidates, function (current, total) {
      progressFill.style.width = (75 + Math.round((current / total) * 25)) + '%';
      title.textContent = 'Looking up ' + current + '/' + total + contextInfo + '...';
    }).then(function (foundPlaces) {
      progressFill.style.width = '100%';
      document.getElementById('scan-progress').classList.add('hidden');
      scanFoundPlaces = foundPlaces;

      if (foundPlaces.length === 0) {
        title.textContent = 'No locations found. Try manual search below.';
        document.getElementById('scan-found-places').innerHTML = '<div class="loading">No matching locations.</div>';
      } else {
        title.textContent = foundPlaces.length + ' place' + (foundPlaces.length > 1 ? 's' : '') + ' found' + contextInfo + '!';
        renderScanFoundPlaces(foundPlaces);
      }
    });
  }).catch(function () {
    title.textContent = 'Failed to scan image.';
    document.getElementById('scan-progress').classList.add('hidden');
  });

  e.target.value = '';
});

function renderScanFoundPlaces(foundPlaces) {
  var container = document.getElementById('scan-found-places');
  container.innerHTML = '';

  if (foundPlaces.length > 1) {
    var addAllBtn = document.createElement('button');
    addAllBtn.className = 'scan-add-all-btn';
    addAllBtn.textContent = 'Add All ' + foundPlaces.length + ' Places';
    addAllBtn.onclick = function () { addAllScanPlaces(); };
    container.appendChild(addAllBtn);
  }

  foundPlaces.forEach(function (place, index) {
    var div = document.createElement('div');
    div.className = 'scan-place-item';
    div.innerHTML = '<div class="scan-place-info">'
      + '<div class="scan-place-name">' + escapeHTML(place.name) + '</div>'
      + '<div class="scan-place-address">' + escapeHTML(place.address) + '</div>'
      + '</div>'
      + '<button class="scan-add-btn" data-index="' + index + '">Add</button>';

    div.querySelector('.scan-add-btn').onclick = function (e) { e.stopPropagation(); addScanPlace(index); };
    div.onclick = function () { map.setView([place.lat, place.lng], 15); };
    container.appendChild(div);
  });
}

function addScanPlace(index) {
  var place = scanFoundPlaces[index];
  if (!place) return;

  var btn = document.querySelector('.scan-add-btn[data-index="' + index + '"]');
  if (btn && btn.disabled) return;

  var trip = getCurrentTrip();
  if (!trip) return;

  var newPlace = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: place.name,
    description: '',
    category: 'attraction',
    tags: [],
    lat: place.lat,
    lng: place.lng,
    cost: 0,
    duration: 60,
    dayIndex: undefined,
    orderInDay: undefined,
    createdAt: new Date().toISOString(),
  };

  trip.places.push(newPlace);
  persistTrips();
  addMarkerToMap(newPlace);
  renderPlacesList();

  if (btn) {
    btn.textContent = 'Added';
    btn.disabled = true;
    btn.classList.add('scan-btn-added');
  }
}

function addAllScanPlaces() {
  scanFoundPlaces.forEach(function (_, index) { addScanPlace(index); });
  var addAllBtn = document.querySelector('.scan-add-all-btn');
  if (addAllBtn) { addAllBtn.textContent = 'All Added!'; addAllBtn.disabled = true; addAllBtn.classList.add('scan-btn-added'); }
}

function scanGeoSearch() {
  var query = document.getElementById('scan-search-input').value.trim();
  if (!query) return;
  var resultsDiv = document.getElementById('scan-geo-results');
  resultsDiv.innerHTML = '<div class="loading">Searching...</div>';

  fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&q=' + encodeURIComponent(query))
    .then(function (res) { return res.json(); })
    .then(function (data) {
      resultsDiv.innerHTML = '';
      if (data.length === 0) { resultsDiv.innerHTML = '<div class="loading">No results.</div>'; return; }
      data.forEach(function (item) {
        var div = document.createElement('div');
        div.className = 'geo-result-item';
        var nameParts = item.display_name.split(',');
        div.innerHTML = '<div class="result-name">' + escapeHTML(nameParts[0]) + '</div>'
          + '<div class="result-address">' + escapeHTML(nameParts.slice(1, 4).join(',').trim()) + '</div>';
        div.onclick = function () { closeScanPanel(); selectGeoResult(parseFloat(item.lat), parseFloat(item.lon), item.display_name); };
        resultsDiv.appendChild(div);
      });
    })
    .catch(function () { resultsDiv.innerHTML = '<div class="loading">Search failed.</div>'; });
}

document.getElementById('scan-search-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); scanGeoSearch(); }
});

function closeScanPanel() {
  document.getElementById('scan-panel').classList.add('hidden');
  userProvidedContext = '';
}

function toggleRawText() {
  var container = document.getElementById('scan-raw-container');
  var btn = document.getElementById('scan-raw-toggle');
  container.classList.toggle('hidden');
  btn.textContent = container.classList.contains('hidden') ? 'Show extracted text' : 'Hide extracted text';
}

// ============================================================
// REVERSE GEOCODING
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
    .catch(function () { callback('', ''); });
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
// PLACE FORM
// ============================================================

var editingPlaceId = null;

function showForm(prefillName) {
  var form = document.getElementById('place-form');
  form.classList.remove('hidden');
  document.getElementById('place-name').value = prefillName || '';
  document.getElementById('place-desc').value = '';
  document.getElementById('place-category').value = 'attraction';
  document.getElementById('place-tags').value = '';
  document.getElementById('place-cost').value = '';
  document.getElementById('place-duration').value = '60';
  document.getElementById('form-location-preview').classList.add('hidden');
  document.getElementById('form-title').textContent = 'Save this place';
  editingPlaceId = null;

  // Populate day dropdown
  populateDaySelect('place-day');

  document.getElementById('place-name').focus();
}

function populateDaySelect(selectId) {
  var select = document.getElementById(selectId);
  var days = getTripDays();
  select.innerHTML = '<option value="">Unassigned</option>';
  days.forEach(function (d) {
    select.innerHTML += '<option value="' + d.index + '">Day ' + (d.index + 1) + ' - ' + d.dateStr + '</option>';
  });
}

function editPlaceFromPopup(placeId) {
  var places = getPlaces();
  var place = places.find(function (p) { return p.id === placeId; });
  if (!place) return;

  map.closePopup();
  switchTab('places');

  var form = document.getElementById('place-form');
  form.classList.remove('hidden');
  document.getElementById('form-title').textContent = 'Edit Place';
  document.getElementById('place-name').value = place.name;
  document.getElementById('place-desc').value = place.description || '';
  document.getElementById('place-category').value = place.category || 'attraction';
  document.getElementById('place-tags').value = (place.tags || []).join(', ');
  document.getElementById('place-cost').value = place.cost || '';
  document.getElementById('place-duration').value = place.duration || '60';

  populateDaySelect('place-day');
  document.getElementById('place-day').value = (place.dayIndex !== undefined && place.dayIndex !== null) ? place.dayIndex : '';

  pendingLatLng = { lat: place.lat, lng: place.lng };
  editingPlaceId = placeId;
}

function cancelForm() {
  document.getElementById('place-form').classList.add('hidden');
  document.getElementById('form-location-preview').classList.add('hidden');
  if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
  pendingLatLng = null;
  editingPlaceId = null;
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

  var trip = getCurrentTrip();
  if (!trip) return;

  var tagsRaw = document.getElementById('place-tags').value.trim();
  var tags = tagsRaw ? tagsRaw.split(',').map(function (t) { return t.trim().toLowerCase(); }).filter(function (t) { return t.length > 0; }) : [];

  var dayVal = document.getElementById('place-day').value;
  var dayIndex = dayVal !== '' ? parseInt(dayVal) : undefined;

  if (editingPlaceId) {
    // Update existing place
    var place = trip.places.find(function (p) { return p.id === editingPlaceId; });
    if (place) {
      place.name = name;
      place.description = document.getElementById('place-desc').value.trim();
      place.category = document.getElementById('place-category').value;
      place.tags = tags;
      place.cost = parseFloat(document.getElementById('place-cost').value) || 0;
      place.duration = parseInt(document.getElementById('place-duration').value) || 60;
      place.lat = pendingLatLng.lat;
      place.lng = pendingLatLng.lng;

      if (dayIndex !== undefined) {
        if (place.dayIndex !== dayIndex) {
          var dayPlaces = trip.places.filter(function (p) { return p.dayIndex === dayIndex && p.id !== place.id; });
          place.orderInDay = dayPlaces.length;
        }
        place.dayIndex = dayIndex;
      } else {
        place.dayIndex = undefined;
        place.orderInDay = undefined;
      }

      // Update marker
      if (markers[place.id]) {
        map.removeLayer(markers[place.id]);
        delete markers[place.id];
      }
      addMarkerToMap(place);
    }
  } else {
    // New place
    var newPlace = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: name,
      description: document.getElementById('place-desc').value.trim(),
      category: document.getElementById('place-category').value,
      tags: tags,
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      cost: parseFloat(document.getElementById('place-cost').value) || 0,
      duration: parseInt(document.getElementById('place-duration').value) || 60,
      dayIndex: dayIndex,
      orderInDay: dayIndex !== undefined ? trip.places.filter(function (p) { return p.dayIndex === dayIndex; }).length : undefined,
      createdAt: new Date().toISOString(),
    };

    trip.places.push(newPlace);

    if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
    addMarkerToMap(newPlace);
  }

  persistTrips();
  document.getElementById('place-form').classList.add('hidden');
  document.getElementById('form-location-preview').classList.add('hidden');
  pendingLatLng = null;
  editingPlaceId = null;
  refreshAll();
}

// ============================================================
// CRUD
// ============================================================

function deletePlace(id) {
  var trip = getCurrentTrip();
  if (!trip) return;

  trip.places = trip.places.filter(function (p) { return p.id !== id; });
  persistTrips();

  if (markers[id]) { map.removeLayer(markers[id]); delete markers[id]; }
  map.closePopup();
  refreshAll();
}

function goToPlace(id) {
  var places = getPlaces();
  var place = places.find(function (p) { return p.id === id; });
  if (!place) return;
  map.setView([place.lat, place.lng], 16);
  if (markers[id]) markers[id].openPopup();
  if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
}

// ============================================================
// PERSISTENCE
// ============================================================

function persistTrips() {
  localStorage.setItem('tripPlanner_trips', JSON.stringify(trips));
  localStorage.setItem('tripPlanner_currentTrip', currentTripId || '');
}

// ============================================================
// PLACES LIST (Places tab)
// ============================================================

function renderCategoryFilters() {
  var container = document.getElementById('category-filters');
  if (!container) return;
  container.innerHTML = '';

  var places = getPlaces();
  var catCount = {};
  places.forEach(function (p) {
    var cat = p.category || 'other';
    catCount[cat] = (catCount[cat] || 0) + 1;
  });

  Object.keys(catCount).forEach(function (catKey) {
    var cat = categories[catKey] || categories.other;
    var chip = document.createElement('button');
    chip.className = 'tag-filter-chip' + (activeCategoryFilter === catKey ? ' active' : '');
    chip.style.borderColor = cat.color;
    if (activeCategoryFilter === catKey) chip.style.background = cat.color;
    chip.textContent = cat.icon + ' ' + cat.label + ' (' + catCount[catKey] + ')';
    chip.onclick = function (e) {
      e.preventDefault();
      activeCategoryFilter = activeCategoryFilter === catKey ? null : catKey;
      renderCategoryFilters();
      renderPlacesList();
    };
    container.appendChild(chip);
  });
}

function renderPlacesList() {
  var list = document.getElementById('places-list');
  var emptyMsg = document.getElementById('empty-message');
  var searchInput = document.getElementById('search-input');
  var searchText = searchInput ? searchInput.value.toLowerCase() : '';
  list.innerHTML = '';

  var places = getPlaces();

  var filtered = places.filter(function (p) {
    var matchesSearch = true;
    if (searchText) {
      matchesSearch = p.name.toLowerCase().indexOf(searchText) !== -1
        || (p.description || '').toLowerCase().indexOf(searchText) !== -1
        || (p.tags && p.tags.some(function (t) { return t.indexOf(searchText) !== -1; }));
    }
    var matchesCat = true;
    if (activeCategoryFilter) matchesCat = p.category === activeCategoryFilter;
    return matchesSearch && matchesCat;
  });

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

  // Group by category
  var groups = {};
  filtered.forEach(function (place) {
    var cat = place.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(place);
  });

  Object.keys(groups).forEach(function (catKey) {
    var cat = categories[catKey] || categories.other;
    var header = document.createElement('div');
    header.className = 'city-group-header';
    header.style.borderLeft = '4px solid ' + cat.color;
    header.innerHTML = cat.icon + ' ' + cat.label + '<span class="city-count">(' + groups[catKey].length + ')</span>';
    list.appendChild(header);

    groups[catKey].forEach(function (place) {
      var item = document.createElement('div');
      item.className = 'place-item';
      item.onclick = function () { goToPlace(place.id); };

      var dot = document.createElement('div');
      dot.className = 'category-dot';
      dot.style.backgroundColor = cat.color;

      var info = document.createElement('div');
      info.className = 'place-info';

      var nameEl = document.createElement('div');
      nameEl.className = 'place-name';
      nameEl.textContent = place.name;

      var descEl = document.createElement('div');
      descEl.className = 'place-desc';
      var descParts = [];
      if (place.description) descParts.push(place.description);
      if (place.cost) descParts.push('$' + parseFloat(place.cost).toFixed(0));
      if (place.duration) descParts.push(formatDuration(place.duration));
      descEl.textContent = descParts.join(' \u00B7 ') || cat.label;

      info.appendChild(nameEl);
      info.appendChild(descEl);

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

      if (place.dayIndex !== undefined && place.dayIndex !== null) {
        var dayBadge = document.createElement('span');
        dayBadge.className = 'day-badge';
        dayBadge.textContent = 'Day ' + (parseInt(place.dayIndex) + 1);
        dayBadge.style.background = dayColors[place.dayIndex % dayColors.length];
        info.appendChild(dayBadge);
      }

      var delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '&times;';
      delBtn.onclick = function (e) { e.stopPropagation(); deletePlace(place.id); };

      item.appendChild(dot);
      item.appendChild(info);
      item.appendChild(delBtn);
      list.appendChild(item);
    });
  });
}

var searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('input', function () { renderPlacesList(); });
}

// ============================================================
// BUDGET TAB
// ============================================================

function renderBudget() {
  var trip = getCurrentTrip();
  if (!trip) return;

  var totalBudget = trip.budget || 0;
  var places = trip.places || [];
  var expenses = trip.expenses || [];

  // Calculate totals
  var placeCosts = places.reduce(function (sum, p) { return sum + (parseFloat(p.cost) || 0); }, 0);
  var expenseCosts = expenses.reduce(function (sum, e) { return sum + (parseFloat(e.amount) || 0); }, 0);
  var totalSpent = placeCosts + expenseCosts;
  var remaining = totalBudget - totalSpent;

  document.getElementById('budget-total').textContent = '$' + totalBudget.toFixed(0);
  document.getElementById('budget-spent').textContent = '$' + totalSpent.toFixed(0);
  document.getElementById('budget-remaining').textContent = '$' + remaining.toFixed(0);
  document.getElementById('budget-remaining').style.color = remaining >= 0 ? '#34a853' : '#ea4335';

  var pct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  var fill = document.getElementById('budget-progress-fill');
  fill.style.width = pct + '%';
  fill.style.background = pct > 90 ? '#ea4335' : pct > 70 ? '#fbbc04' : '#34a853';

  // By category
  var byCat = {};
  places.forEach(function (p) {
    if (p.cost) {
      var cat = p.category || 'other';
      byCat[cat] = (byCat[cat] || 0) + parseFloat(p.cost);
    }
  });
  expenses.forEach(function (e) {
    var cat = e.category || 'other';
    byCat[cat] = (byCat[cat] || 0) + parseFloat(e.amount);
  });

  var catContainer = document.getElementById('budget-by-category');
  catContainer.innerHTML = '';
  Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }).forEach(function (catKey) {
    var cat = categories[catKey] || categories.other;
    var row = document.createElement('div');
    row.className = 'budget-row';
    var catPct = totalSpent > 0 ? (byCat[catKey] / totalSpent * 100).toFixed(0) : 0;
    row.innerHTML = '<div class="budget-row-label"><span class="budget-dot" style="background:' + cat.color + '"></span>' + cat.icon + ' ' + cat.label + '</div>'
      + '<div class="budget-row-bar"><div class="budget-row-fill" style="width:' + catPct + '%; background:' + cat.color + '"></div></div>'
      + '<div class="budget-row-amount">$' + byCat[catKey].toFixed(0) + '</div>';
    catContainer.appendChild(row);
  });

  // By day
  var byDay = {};
  places.forEach(function (p) {
    if (p.cost && p.dayIndex !== undefined) {
      byDay[p.dayIndex] = (byDay[p.dayIndex] || 0) + parseFloat(p.cost);
    }
  });

  var dayContainer = document.getElementById('budget-by-day');
  dayContainer.innerHTML = '';
  var days = getTripDays();
  days.forEach(function (d) {
    var amount = byDay[d.index] || 0;
    if (amount > 0) {
      var row = document.createElement('div');
      row.className = 'budget-row';
      var dayPct = totalSpent > 0 ? (amount / totalSpent * 100).toFixed(0) : 0;
      var color = dayColors[d.index % dayColors.length];
      row.innerHTML = '<div class="budget-row-label"><span class="budget-dot" style="background:' + color + '"></span>' + d.label + '</div>'
        + '<div class="budget-row-bar"><div class="budget-row-fill" style="width:' + dayPct + '%; background:' + color + '"></div></div>'
        + '<div class="budget-row-amount">$' + amount.toFixed(0) + '</div>';
      dayContainer.appendChild(row);
    }
  });

  // Expenses list
  var expList = document.getElementById('expenses-list');
  expList.innerHTML = '';
  if (expenses.length > 0) {
    expenses.slice().reverse().forEach(function (exp) {
      var cat = categories[exp.category] || categories.other;
      var row = document.createElement('div');
      row.className = 'expense-item';
      row.innerHTML = '<div class="expense-info">'
        + '<div class="expense-name">' + escapeHTML(exp.name) + '</div>'
        + '<div class="expense-cat">' + cat.icon + ' ' + cat.label + '</div>'
        + '</div>'
        + '<div class="expense-amount">$' + parseFloat(exp.amount).toFixed(2) + '</div>'
        + '<button class="icon-btn small danger" onclick="deleteExpense(\'' + exp.id + '\')">&times;</button>';
      expList.appendChild(row);
    });
  }
}

function addExpense() {
  var trip = getCurrentTrip();
  if (!trip) return;

  var name = document.getElementById('expense-name').value.trim();
  var amount = parseFloat(document.getElementById('expense-amount').value);
  if (!name || !amount) return;

  if (!trip.expenses) trip.expenses = [];
  trip.expenses.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name,
    amount: amount,
    category: document.getElementById('expense-category').value,
    createdAt: new Date().toISOString(),
  });

  persistTrips();
  document.getElementById('expense-name').value = '';
  document.getElementById('expense-amount').value = '';
  renderBudget();
}

function deleteExpense(expId) {
  var trip = getCurrentTrip();
  if (!trip || !trip.expenses) return;
  trip.expenses = trip.expenses.filter(function (e) { return e.id !== expId; });
  persistTrips();
  renderBudget();
}

// ============================================================
// NOTES TAB
// ============================================================

function renderNotes() {
  var trip = getCurrentTrip();
  if (!trip) return;

  document.getElementById('trip-notes-editor').value = trip.notes || '';

  var bookingsList = document.getElementById('bookings-list');
  bookingsList.innerHTML = '';

  var bookings = trip.bookings || [];
  bookings.forEach(function (b) {
    var row = document.createElement('div');
    row.className = 'booking-item';

    var linkHTML = '';
    if (b.link && (b.link.startsWith('http://') || b.link.startsWith('https://'))) {
      linkHTML = '<a href="' + escapeHTML(b.link) + '" target="_blank" rel="noopener">' + escapeHTML(b.link) + '</a>';
    } else {
      linkHTML = '<span>' + escapeHTML(b.link || '') + '</span>';
    }

    row.innerHTML = '<div class="booking-info">'
      + '<div class="booking-name">' + escapeHTML(b.name) + '</div>'
      + '<div class="booking-link">' + linkHTML + '</div>'
      + '</div>'
      + '<button class="icon-btn small danger" onclick="deleteBooking(\'' + b.id + '\')">&times;</button>';
    bookingsList.appendChild(row);
  });
}

function saveTripNotes() {
  var trip = getCurrentTrip();
  if (!trip) return;
  trip.notes = document.getElementById('trip-notes-editor').value;
  persistTrips();
}

function addBooking() {
  var trip = getCurrentTrip();
  if (!trip) return;

  var name = document.getElementById('booking-name').value.trim();
  var link = document.getElementById('booking-link').value.trim();
  if (!name) return;

  if (!trip.bookings) trip.bookings = [];
  trip.bookings.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name,
    link: link,
  });

  persistTrips();
  document.getElementById('booking-name').value = '';
  document.getElementById('booking-link').value = '';
  renderNotes();
}

function deleteBooking(bookingId) {
  var trip = getCurrentTrip();
  if (!trip || !trip.bookings) return;
  trip.bookings = trip.bookings.filter(function (b) { return b.id !== bookingId; });
  persistTrips();
  renderNotes();
}

// ============================================================
// EXPORT & SHARE
// ============================================================

function exportTrip() {
  var trip = getCurrentTrip();
  if (!trip) { alert('No trip selected.'); return; }

  var data = JSON.stringify(trip, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = trip.name.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function shareTrip() {
  var trip = getCurrentTrip();
  if (!trip) return;

  var summary = trip.name + '\n';
  if (trip.destination) summary += trip.destination + '\n';
  if (trip.startDate) summary += formatDate(trip.startDate) + (trip.endDate ? ' - ' + formatDate(trip.endDate) : '') + '\n';
  summary += '\n';

  var days = getTripDays();
  if (days.length > 0) {
    days.forEach(function (day) {
      var dayPlaces = trip.places.filter(function (p) { return parseInt(p.dayIndex) === day.index; })
        .sort(function (a, b) { return (a.orderInDay || 0) - (b.orderInDay || 0); });
      if (dayPlaces.length > 0) {
        summary += day.label + ' (' + day.dateStr + '):\n';
        dayPlaces.forEach(function (p, i) {
          summary += '  ' + (i + 1) + '. ' + p.name;
          if (p.cost) summary += ' ($' + parseFloat(p.cost).toFixed(0) + ')';
          summary += '\n';
        });
        summary += '\n';
      }
    });
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(summary).then(function () {
      alert('Trip itinerary copied to clipboard!');
    });
  } else {
    prompt('Copy your itinerary:', summary);
  }
}

// ============================================================
// MAP MANAGEMENT
// ============================================================

function clearAllMarkers() {
  Object.keys(markers).forEach(function (id) { map.removeLayer(markers[id]); });
  markers = {};
  routeLines.forEach(function (line) { map.removeLayer(line); });
  routeLines = [];
}

function loadTripOnMap() {
  var trip = getCurrentTrip();
  if (!trip) return;

  trip.places.forEach(function (place) { addMarkerToMap(place); });

  // Fit map to places
  if (trip.places.length > 0) {
    var group = L.featureGroup(Object.values(markers));
    map.fitBounds(group.getBounds().pad(0.1));
  }

  drawRouteLines();
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

function formatDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr + 'T00:00:00');
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function formatDuration(mins) {
  mins = parseInt(mins);
  if (mins < 60) return mins + 'min';
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  return h + 'h' + (m > 0 ? ' ' + m + 'm' : '');
}

function refreshAll() {
  clearAllMarkers();
  loadTripOnMap();
  var activeTab = document.querySelector('.tab.active');
  if (activeTab) switchTab(activeTab.getAttribute('data-tab'));
}

// ============================================================
// DATA MIGRATION - Import old "myPlaces" data into a trip
// ============================================================

function migrateOldData() {
  var oldPlaces = JSON.parse(localStorage.getItem('myPlaces') || '[]');
  if (oldPlaces.length > 0 && trips.length === 0) {
    var migrated = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: 'My Places (Imported)',
      destination: '',
      startDate: '',
      endDate: '',
      budget: 0,
      notes: '',
      places: oldPlaces.map(function (p) {
        return {
          id: p.id,
          name: p.name,
          description: p.description || '',
          category: p.category === 'default' ? 'attraction' : (p.category || 'attraction'),
          tags: p.tags || [],
          lat: p.lat,
          lng: p.lng,
          cost: 0,
          duration: 60,
          dayIndex: undefined,
          orderInDay: undefined,
          createdAt: p.createdAt || new Date().toISOString(),
        };
      }),
      expenses: [],
      bookings: [],
      createdAt: new Date().toISOString(),
    };

    trips.push(migrated);
    currentTripId = migrated.id;
    persistTrips();
  }
}

// ============================================================
// INITIALIZE
// ============================================================

migrateOldData();

if (currentTripId && !getCurrentTrip()) {
  currentTripId = trips.length > 0 ? trips[0].id : null;
}

updateTripHeader();

if (currentTripId) {
  loadTripOnMap();
}

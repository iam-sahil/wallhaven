import { showToast, handleDownload } from './utils.js';
import { getNextApiKey } from '../assets/pixabaykeys.js';

let currentPage = 1;
let currentQuery = '';
let isFetching = false;
let pinnedImageData = null;

const loader = document.getElementById('loader');
const grid = document.getElementById('imageGrid');

// --------------------- HELPER FUNCTIONS ---------------------
function showLoader(show) {
  loader.style.display = show ? 'block' : 'none';
}

function processTags(tags) {
  const uniqueTags = [...new Set(tags.split(',').map(tag => tag.trim()))];
  return uniqueTags.join(' ');
}

function enforceQueryLimit(query) {
  if (query.length <= 100) return query;
  let truncatedQuery = query.substring(0, 100);
  const lastSpaceIndex = truncatedQuery.lastIndexOf(' ');
  if (lastSpaceIndex !== -1) {
    truncatedQuery = truncatedQuery.substring(0, lastSpaceIndex);
  }
  return truncatedQuery;
}

// For Pixabay images
function normalizeImage(image) {
  return {
    id: image.id,
    thumb: image.webformatURL || image.thumb,
    full: image.largeImageURL || image.full,
    tags: image.tags
  };
}

// --------------------- API FETCHING ---------------------
async function fetchImages(page = 1, query = '') {
  isFetching = true;
  showLoader(true);

  // Read the selected API from the dropdown.
  const selectedApi = document.getElementById('apiDropdown').value;
  console.log("Selected API:", selectedApi);

  // Construct the URL to call your Vercel serverless proxy
  const url = `/api/proxy?api=${selectedApi}&query=${encodeURIComponent(
    enforceQueryLimit(query)
  )}&page=${page}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    let images = [];

    if (selectedApi === 'pixabay') {
      // Pixabay response: data.hits is your array of images.
      images = data.hits.map(img => normalizeImage(img));
    } else if (selectedApi === 'wallhaven') {
      // Wallhaven response: data.data is the array of images.
      images = data.data.map(image => ({
        id: image.id,
        // Choose an appropriate thumb from the wallhaven thumbs object.
        thumb: image.thumbs.small,
        full: image.path,
        tags: image.tags || ''
      }));
    }

    if (images.length === 0) {
      showToast('No images found for your search.');
    } else {
      await displayImages(images);
    }
  } catch (error) {
    console.error(`Error fetching images from ${selectedApi}:`, error);
    showToast('Unable to load images right now. Please try again.');
  } finally {
    isFetching = false;
    showLoader(false);
  }
}

// --------------------- HYBRID FAVOURITES FUNCTIONALITY ---------------------
function handleFavourite(imageData) {
  let favourites = JSON.parse(localStorage.getItem('favourites') || '[]');
  // Attach the current API selection if not already set.
  if (!imageData.api) {
    imageData.api = document.getElementById('apiDropdown').value;
  }
  const exists = favourites.some(fav =>
    fav.isFull ? fav.data.id === imageData.id : fav.id === imageData.id
  );
  if (exists) {
    showToast('Image is already in favourites.');
    return;
  }
  let newFavourite;
  if (favourites.length < 25) {
    newFavourite = {
      isFull: true,
      data: imageData,
      api: imageData.api
    };
  } else {
    newFavourite = {
      isFull: false,
      id: imageData.id,
      thumb: imageData.thumb,
      api: imageData.api
    };
  }
  favourites.push(newFavourite);
  localStorage.setItem('favourites', JSON.stringify(favourites));
  showToast('Image added to favourites!');
}

// --------------------- IMAGE CLICK (TAG SEARCH) ---------------------
function handleImageClick(e, imageData, container) {
  if (e.target.closest('.download-btn') || e.target.closest('.favourite-btn')) return;
  pinnedImageData = imageData;
  currentQuery = processTags(imageData.tags);
  if (!currentQuery) {
    showToast('No valid tags available for search.');
    return;
  }
  currentPage = 1;
  grid.innerHTML = '';
  gsap.to(window, { duration: 0.8, scrollTo: { y: 0 } });
  displayPinnedImage(imageData);
  showToast('Searching for similar images...');
  fetchImages(currentPage, currentQuery);
}

// --------------------- RENDERING FUNCTIONS ---------------------
function displayPinnedImage(image) {
  const container = document.createElement('div');
  container.classList.add('img-container');
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute('aria-label', 'Click to search for similar images');
  container.addEventListener('click', (e) => e.stopPropagation());
  
  const img = document.createElement('img');
  // Use Pixabay properties first; if not present, try Wallhaven's thumbs.
  img.src = image.webformatURL || image.thumb || (image.thumbs && (image.thumbs.small || image.thumbs.large || image.thumbs.original)) || 'https://dummyimage.com/150x150/000/fff';
  if (Array.isArray(image.tags)) {
    img.alt = image.tags.map(tag => tag.name).join(', ');
  } else {
    img.alt = image.tags || "Favourite image";
  }
  container.appendChild(img);
  
  const downloadLink = document.createElement('a');
  downloadLink.classList.add('download-btn');
  downloadLink.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
         fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
      <path d="m14 19 3 3v-5.5"/>
      <path d="m17 22 3-3"/>
      <circle cx="9" cy="9" r="2"/>
    </svg>`;
  downloadLink.href = image.largeImageURL || image.full || image.path || image.webformatURL;
  downloadLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleDownload(e, image);
  });
  container.appendChild(downloadLink);
  
  const favouriteBtn = document.createElement('button');
  favouriteBtn.classList.add('favourite-btn');
  favouriteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>`;
  favouriteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handleFavourite(image);
  });
  container.appendChild(favouriteBtn);
  
  grid.appendChild(container);
  gsap.from(container, { duration: 0.5, opacity: 0, scale: 0.95, ease: "back.out(1.7)" });
}

// This function now accepts an API parameter to choose the correct endpoint.
function fetchFullImageData(imageId, api) {
  if (api === 'wallhaven') {
    const url = `https://wallhaven.cc/api/v1/w/${imageId}`;
    return fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.data) {
          return data.data;
        } else {
          removeFavourite(imageId);
          throw new Error("No data found for image ID " + imageId);
        }
      });
  } else {
    // Default to Pixabay
    const apiKey = getNextApiKey();
    const url = `https://pixabay.com/api/?key=${apiKey}&id=${imageId}`;
    return fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.hits && data.hits.length > 0) {
          return data.hits[0];
        } else {
          removeFavourite(imageId);
          throw new Error("No data found for image ID " + imageId);
        }
      });
  }
}

function removeFavourite(imageId) {
  let favourites = JSON.parse(localStorage.getItem("favourites") || "[]");
  favourites = favourites.filter(fav =>
    fav.isFull ? fav.data.id !== imageId : fav.id !== imageId
  );
  localStorage.setItem("favourites", JSON.stringify(favourites));
}

// --------------------- MAIN CODE (DOM Content Loaded) ---------------------
document.addEventListener("DOMContentLoaded", () => {
  // Animate title and grid elements
  gsap.from(".title", { duration: 1, opacity: 0, y: -50, ease: "power2.out" });
  gsap.from(".image-grid", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.5 });
  
  // Render favourites if the favouritesGrid exists
  const favouritesGrid = document.getElementById("favouritesGrid");
  if (favouritesGrid) {
    let favourites = JSON.parse(localStorage.getItem("favourites") || "[]");
    if (favourites.length === 0) {
      favouritesGrid.innerHTML = "<p style='color: var(--text-color); text-align: center;'>No favourites yet.</p>";
    } else {
      favourites.forEach(item => {
        if (item.isFull) {
          renderFavouriteItem(item.data, favouritesGrid);
        } else {
          fetchFullImageData(item.id, item.api)
            .then(fullData => {
              renderFavouriteItem(fullData, favouritesGrid);
            })
            .catch(err => {
              console.error("Error fetching image details for id " + item.id, err);
            });
        }
      });
    }
  }
  
  // Start the typewriter effect and initial image search.
  gsap.from(".search-container", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.5 });
  typeWriter();
  fetchImages(currentPage, "aesthetic");
});

// --------------------- ADDITIONAL FUNCTIONS ---------------------
async function displayImages(images) {
  images.forEach((image) => {
    if (pinnedImageData && image.id === pinnedImageData.id) return;
    const container = document.createElement('div');
    container.classList.add('img-container');
    container.setAttribute('role', 'button');
    container.setAttribute('tabindex', '0');
    container.setAttribute('aria-label', 'Click to search for similar images');
    
    const img = document.createElement('img');
    img.src = image.webformatURL || image.thumb || (image.thumbs && (image.thumbs.small || image.thumbs.large || image.thumbs.original));
    img.alt = Array.isArray(image.tags) ? image.tags.map(tag => tag.name).join(', ') : image.tags;
    container.appendChild(img);
    
    const downloadLink = document.createElement('a');
    downloadLink.classList.add('download-btn');
    downloadLink.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
           fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
        <path d="m14 19 3 3v-5.5"/>
        <path d="m17 22 3-3"/>
        <circle cx="9" cy="9" r="2"/>
      </svg>`;
    downloadLink.href = image.largeImageURL || image.full || image.path || image.webformatURL;
    downloadLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleDownload(e, image);
    });
    container.appendChild(downloadLink);
    
    const favouriteBtn = document.createElement('button');
    favouriteBtn.classList.add('favourite-btn');
    favouriteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
      </svg>`;
    favouriteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleFavourite(image);
    });
    container.appendChild(favouriteBtn);
    
    container.addEventListener('click', (e) => {
      handleImageClick(e, image, container);
    });
    
    grid.appendChild(container);
    gsap.from(container, { duration: 0.5, opacity: 0, scale: 0.95, ease: "back.out(1.7)" });
  });
  if (grid.offsetHeight < window.innerHeight * 2 && !isFetching) {
    currentPage++;
    fetchImages(currentPage, currentQuery);
  }
}

function doSearch() {
  currentQuery = document.getElementById('searchTerm').value.trim();
  currentPage = 1;
  pinnedImageData = null;
  grid.innerHTML = '';
  gsap.to(window, { duration: 0.8, scrollTo: { y: 0 } });
  fetchImages(currentPage, currentQuery);
}

const placeholderText = "Searching for some cats perhaps...";
const searchInput = document.getElementById("searchTerm");
let placeholderIndex = 0;
function typeWriter() {
  if (placeholderIndex <= placeholderText.length) {
    searchInput.setAttribute("placeholder", placeholderText.substring(0, placeholderIndex));
    placeholderIndex++;
    setTimeout(typeWriter, 150);
  } else {
    setTimeout(() => {
      placeholderIndex = 0;
      typeWriter();
    }, 2000);
  }
}

const observerOptions = { rootMargin: "0px 0px 1000px 0px" };
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !isFetching) {
    currentPage++;
    fetchImages(currentPage, currentQuery);
  }
}, observerOptions);
observer.observe(document.getElementById("sentinel"));

document.getElementById("searchBtn").addEventListener("click", doSearch);
document.getElementById("searchTerm").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});
document.getElementById("favouritesPageBtn").addEventListener("click", () => {
  window.location.href = "favourites.html";
});

document.addEventListener("DOMContentLoaded", () => {
    // Animate title and grid elements
    gsap.from(".title", { duration: 1, opacity: 0, y: -50, ease: "power2.out" });
    gsap.from(".image-grid", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.5 });
    gsap.from(".search-container", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.5 });
    typeWriter();
    const apiDropdown = document.getElementById('apiDropdown');
    apiDropdown.addEventListener('change', () => {
        console.log("API Dropdown changed to:", apiDropdown.value); // Verify event is firing and getting new value
        grid.innerHTML = '';    // Clear the image grid
    });
    // --- WORKAROUND IMPLEMENTATION ---
    const initialApi = document.getElementById('apiDropdown').value;
    let initialQuery = "";
    if (initialApi === 'wallhaven') {
      initialQuery = "goku"; // Use "goku" for Wallhaven initial load
    } else if (initialApi === 'pixabay') {
      initialQuery = "aesthetic"; // Use "aesthetic" for Pixabay initial load
    }
    fetchImages(currentPage, initialQuery); // Fetch with API-specific initial query
    // --- END WORKAROUND IMPLEMENTATION ---
  });
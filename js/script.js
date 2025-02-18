import { getNextApiKey } from './pixabaykeys.js';

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

function showToast(message) {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  gsap.to(toast, { opacity: 1, duration: 0.5 });
  setTimeout(() => {
    gsap.to(toast, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        toastContainer.removeChild(toast);
      },
    });
  }, 2000);
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


function normalizeImage(image) {
    return {
      id: image.id,
      thumb: image.webformatURL,
      full: image.largeImageURL,
      tags: image.tags
    };
  }

// --------------------- API FETCHING ---------------------
async function fetchImages(page = 1, query = '') {
  isFetching = true;
  showLoader(true);

  const apiKey = getNextApiKey();
  const encodedQuery = encodeURIComponent(enforceQueryLimit(query));
  const imagesPerPage = 50;
  const url = query
    ? `https://pixabay.com/api/?key=${apiKey}&q=${encodedQuery}&page=${page}&image_type=photo&per_page=${imagesPerPage}`
    : `https://pixabay.com/api/?key=${apiKey}&page=${page}&image_type=photo&per_page=${imagesPerPage}`;
  console.log('Fetching Pixabay URL:', url);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (data.hits.length === 0) {
      showToast('No images found for your search.');
    } else {
      const images = data.hits.map(img => normalizeImage(img));
      await displayImages(images);
    }
  } catch (error) {
    console.error('Error fetching images from Pixabay:', error);
    showToast('Unable to load images right now. Please try again.');
  } finally {
    isFetching = false;
    showLoader(false);
  }
}


// --------------------- IMAGE DOWNLOAD ---------------------
async function handleDownload(e, image) {
  e.stopPropagation();
  e.preventDefault();
  const imageUrl = image.full; // Use the normalized "full" URL.
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const objectURL = URL.createObjectURL(blob);
    const tempLink = document.createElement("a");
    tempLink.href = objectURL;
    
    // Determine file extension from the URL.
    let extension = "jpg";
    const urlParts = imageUrl.split(".");
    if (urlParts.length > 1) {
      extension = urlParts[urlParts.length - 1].split("?")[0];
    }
    
    tempLink.download = `wallhaven-${image.id}.${extension}`;
    
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(objectURL);
    showToast("Thank you for downloading!");
  } catch (error) {
    console.error("Error downloading image:", error);
    showToast("Unable to download the image.");
  }
}

// --------------------- HYBRID FAVOURITES FUNCTIONALITY ---------------------
function handleFavourite(imageData) {
  let favourites = JSON.parse(localStorage.getItem('favourites') || '[]');
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
      data: imageData
    };
  } else {
    newFavourite = {
      isFull: false,
      id: imageData.id,
      thumb: imageData.thumb
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
  img.src = image.webformatURL || image.thumb;
  img.alt = image.tags;
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
  downloadLink.href = image.largeImageURL || image.full || image.webformatURL;
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

async function displayImages(images) {
  images.forEach((image) => {
    if (pinnedImageData && image.id === pinnedImageData.id) return;
    const container = document.createElement('div');
    container.classList.add('img-container');
    container.setAttribute('role', 'button');
    container.setAttribute('tabindex', '0');
    container.setAttribute('aria-label', 'Click to search for similar images');
    
    const img = document.createElement('img');
    img.src = image.webformatURL || image.thumb;
    img.alt = image.tags;
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
    downloadLink.href = image.largeImageURL || image.full || image.webformatURL;
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
  gsap.from(".title", { duration: 1, opacity: 0, y: -50, ease: "power2.out" });
  gsap.from(".image-grid", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.5 });
  gsap.from(".search-container", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.5 });
  typeWriter();
  fetchImages(currentPage, "aesthetic");
});

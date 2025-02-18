import { getNextApiKey } from '../assets/pixabaykeys.js';
import { showToast, handleDownload } from './utils.js';

// --------------------- MAIN CODE ---------------------
document.addEventListener("DOMContentLoaded", () => {
    gsap.from(".title", { duration: 1, opacity: 0, y: -50, ease: "power2.out" });
    gsap.from(".image-grid", { duration: 1, opacity: 0, y: -20, ease: "power2.out", delay: 0.25 });
    const grid = document.getElementById("favouritesGrid");
    if (!grid) {
        return;
    }

    // Retrieve favourites from localStorage (should be an array of objects)
    let favourites = JSON.parse(localStorage.getItem("favourites") || "[]");
    if (favourites.length === 0) {
        grid.innerHTML = "<p style='color: var(--text-color); text-align: center;'>No favourites yet.</p>";
        return;
    }

    // Render each favourite item
    favourites.forEach(item => {
        if (item.isFull) {
            renderFavouriteItem(item.data, grid);
        } else {
            // Pass the stored API source (e.g., "pixabay" or "wallhaven")
            fetchFullImageData(item.id, item.api)
                .then(fullData => {
                    renderFavouriteItem(fullData, grid);
                })
                .catch(err => {
                    console.error("Error fetching image details for id " + item.id, err);
                });
        }
    });
});

// Render a single favourite item in the grid
function renderFavouriteItem(image, container) {
    const favContainer = document.createElement("div");
    favContainer.classList.add("img-container");

    // Create and set up the image element
    const img = document.createElement("img");
    
    // Determine the image source based on available properties:
    let imageSrc = '';
    if (image.webformatURL || image.thumb) {
        imageSrc = image.webformatURL || image.thumb;
    } else if (image.thumbs) {
        // Wallhaven images use a 'thumbs' object
        imageSrc = image.thumbs.small || image.thumbs.large || image.thumbs.original;
    } else {
        imageSrc = 'https://dummyimage.com/150x150/000/fff';
    }
    img.src = imageSrc;
    
    // For alt text: if image.tags is an array (wallhaven returns tag objects), join them; otherwise, use as is.
    if (Array.isArray(image.tags)) {
        img.alt = image.tags.map(tag => tag.name).join(', ');
    } else {
        img.alt = image.tags || "Favourite image";
    }
    favContainer.appendChild(img);

    // Download button
    const downloadLink = document.createElement("a");
    downloadLink.classList.add("download-btn");
    downloadLink.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
            <path d="m14 19 3 3v-5.5"/>
            <path d="m17 22 3-3"/>
            <circle cx="9" cy="9" r="2"/>
        </svg>`;
    // Use image.largeImageURL, image.full, or image.path (for Wallhaven) as download link
    downloadLink.href = image.largeImageURL || image.full || image.path || image.webformatURL;
    downloadLink.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDownload(e, image);
    });
    favContainer.appendChild(downloadLink);

    // Favourite (Remove) button with hover effect
    const favouriteBtn = document.createElement("button");
    favouriteBtn.classList.add("favourite-btn");
    favouriteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
    `;
    favouriteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFavourite(image.id);
        gsap.to(favContainer, {
            duration: 0.5,
            opacity: 0,
            scale: 0.95,
            ease: "back.in(1.7)",
            onComplete: () => favContainer.remove()
        });
        showToast("Image removed from favourites!");
    });
    favContainer.appendChild(favouriteBtn);

    container.appendChild(favContainer);

    if (typeof gsap !== "undefined") {
        gsap.from(favContainer, { duration: 0.5, opacity: 0, scale: 0.95, ease: "back.out(1.7)" });
    }
}

// Updated fetchFullImageData to support both Pixabay and Wallhaven favourites
function fetchFullImageData(imageId, api) {
    if (api === 'wallhaven') {
        // For Wallhaven, use the detail endpoint:
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
    } else { // default to Pixabay
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

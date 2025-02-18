// utils.js - Contains shared utility functions

export async function handleDownload(e, image) {
    e.stopPropagation();
    e.preventDefault();

    const imageUrl = image.largeImageURL || image.full || image.webformatURL; // Prioritize largeImageURL

    if (!imageUrl) {
        console.error("No image URL available for download:", image);
        showToast("Unable to download the image."); // Assuming showToast is available
        return; // Important: Stop execution if no URL
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const objectURL = URL.createObjectURL(blob);
        const tempLink = document.createElement("a");
        tempLink.href = objectURL;

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
        showToast("Thank you for downloading!"); // Assuming showToast is available
    } catch (error) {
        console.error("Error downloading image:", error);
        showToast("Unable to download the image."); // Assuming showToast is available
    }
}

export async function showToast(message) {
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
document.addEventListener('DOMContentLoaded', () => {
    const loadCollectionBtn = document.getElementById('load-collection-btn');
    const uploadCollectionBtn = document.getElementById('upload-collection-btn');
    const newCollectionBtn = document.getElementById('new-collection-btn');
    const fileUploader = document.getElementById('file-uploader');

    // --- Pop-up Logic ---
    function showPopup(message, isConfirmation = false, onConfirm, onCancel) {
        const popup = document.createElement('div');
        popup.className = 'popup';
        const popupContent = document.createElement('div');
        popupContent.className = 'popup-content';

        if (!isConfirmation) {
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close-btn';
            closeBtn.innerHTML = '&times;';
            popupContent.appendChild(closeBtn);

            closeBtn.onclick = () => {
                document.body.removeChild(popup);
            };
        }

        const popupMessage = document.createElement('p');
        popupMessage.textContent = message;
        popupContent.appendChild(popupMessage);

        if (isConfirmation) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'action-buttons';

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = "Yes, I'm sure. Overwrite";
            confirmBtn.className = 'btn btn-danger';
            confirmBtn.onclick = () => {
                if (onConfirm) onConfirm();
                document.body.removeChild(popup);
            };

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'No! Take me back >:(';
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.onclick = () => {
                if (onCancel) onCancel();
                document.body.removeChild(popup);
            };

            buttonContainer.appendChild(confirmBtn);
            buttonContainer.appendChild(cancelBtn);
            popupContent.appendChild(buttonContainer);
        }

        popup.appendChild(popupContent);
        document.body.appendChild(popup);

        window.onclick = (event) => {
            if (event.target == popup) {
                document.body.removeChild(popup);
            }
        };
    }

    // --- Button Event Listeners ---

    // 1. Load Saved Collection
    loadCollectionBtn.addEventListener('click', () => {
        gtag('event', 'load_collection');
        const request = indexedDB.open('ChrissyCardsDB', 2);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('collections')) {
                db.createObjectStore('collections', { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['collections'], 'readonly');
            const objectStore = transaction.objectStore('collections');
            const getRequest = objectStore.get('userCollectionQuantities');

            getRequest.onsuccess = () => {
                if (getRequest.result && getRequest.result.data) {
                    sessionStorage.setItem('collectionQuantities', JSON.stringify(getRequest.result.data));
                    window.location.href = 'collection.html';
                } else {
                    showPopup('No local collection found');
                }
            };

            getRequest.onerror = (err) => {
                console.error("Error fetching from IndexedDB:", err);
                showPopup('Error checking for a local collection.');
            };
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.errorCode);
            showPopup('Could not access local storage.');
        };
    });

    // 2. Upload Collection File
    uploadCollectionBtn.addEventListener('click', () => {
        gtag('event', 'upload_collection');
        fileUploader.click();
    });

    fileUploader.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        if (file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const quantities = JSON.parse(e.target.result);
                    if (Array.isArray(quantities) && quantities.every(item => typeof item === 'number')) {
                        sessionStorage.setItem('collectionQuantities', JSON.stringify(quantities));
                        window.location.href = 'collection.html';
                    } else {
                        throw new Error('Invalid data format. Expected an array of numbers.');
                    }
                } catch (error) {
                    showPopup(error.message || 'Invalid JSON format.');
                }
            };
            reader.readAsText(file);
        } else {
            showPopup('Invalid file. Please upload a .json file.');
        }

        fileUploader.value = '';
    });

    // 3. Start New Collection
    newCollectionBtn.addEventListener('click', () => {
        gtag('event', 'new_collection');
        const request = indexedDB.open('ChrissyCardsDB', 2);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['collections'], 'readonly');
            const objectStore = transaction.objectStore('collections');
            const getRequest = objectStore.get('userCollectionQuantities');

            getRequest.onsuccess = () => {
                if (getRequest.result && getRequest.result.data) {
                    showPopup(
                        "Are you sure you want to start a new collection? This will overwrite a previously saved collection on your machine!",
                        true,
                        proceedWithNewCollection,
                        () => {}
                    );
                } else {
                    proceedWithNewCollection();
                }
            };

            getRequest.onerror = (err) => {
                console.error("Error fetching from IndexedDB:", err);
                proceedWithNewCollection();
            };
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.errorCode);
            proceedWithNewCollection();
        };
    });

    function proceedWithNewCollection() {
        sessionStorage.removeItem('collectionQuantities');
        const request = indexedDB.open('ChrissyCardsDB', 2);

        request.onsuccess = (event) => {
            const db = event.target.result;
            if (db.objectStoreNames.contains('collections')) {
                const transaction = db.transaction(['collections'], 'readwrite');
                const objectStore = transaction.objectStore('collections');
                const clearRequest = objectStore.clear();

                clearRequest.onsuccess = () => {
                    window.location.href = 'collection.html';
                };
                clearRequest.onerror = (err) => {
                    console.error("Error clearing IndexedDB:", err);
                    window.location.href = 'collection.html';
                };
            } else {
                window.location.href = 'collection.html';
            }
        };

        request.onerror = () => {
            // If DB access fails, still proceed to the collection page
            window.location.href = 'collection.html';
        };
    }
});
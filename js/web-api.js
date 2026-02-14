// Web API shim - replaces Electron's window.api with browser-native equivalents

(function() {
    // Store file reference from open dialog for subsequent importCharacter call
    let _pendingFile = null;

    window.api = {
        // Load game data via fetch
        loadGameData: async (filename) => {
            const response = await fetch('data/' + filename);
            if (!response.ok) throw new Error(`Failed to load ${filename}`);
            return response.json();
        },

        // Character file operations (legacy - no-ops for web)
        listCharacters: async () => [],
        loadCharacter: async () => ({ success: false, error: 'Not supported in web version' }),
        saveCharacter: async () => ({ success: false, error: 'Not supported in web version' }),
        deleteCharacter: async () => ({ success: false, error: 'Not supported in web version' }),

        // Show save dialog - returns a synthetic result with the filename
        showSaveDialog: async (defaultName) => {
            return { canceled: false, filePath: defaultName || 'character.character' };
        },

        // Show open dialog - opens file picker and stores file reference
        showOpenDialog: () => {
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.character,.json';
                input.onchange = () => {
                    if (!input.files || !input.files[0]) {
                        resolve({ canceled: true });
                        return;
                    }
                    _pendingFile = input.files[0];
                    resolve({
                        canceled: false,
                        filePaths: [input.files[0].name]
                    });
                };
                input.oncancel = () => resolve({ canceled: true });
                input.click();
            });
        },

        // Export character - triggers browser download
        exportCharacter: async (character, filePath) => {
            const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filePath || 'character.json';
            a.click();
            URL.revokeObjectURL(url);
            return { success: true };
        },

        // Import character - reads the file stored by showOpenDialog
        importCharacter: async () => {
            if (!_pendingFile) {
                return { success: false, error: 'No file selected' };
            }
            try {
                const text = await _pendingFile.text();
                const character = JSON.parse(text);
                _pendingFile = null;
                return { success: true, character };
            } catch (e) {
                _pendingFile = null;
                return { success: false, error: 'Failed to read file: ' + e.message };
            }
        },

        // PDF export - use browser print
        exportPDF: async () => {
            window.print();
            return { success: true };
        },

        // Native dialog replacements
        showConfirm: async (message) => {
            return confirm(message);
        },

        showMessage: async (message) => {
            alert(message);
        },

        // Window close handling - use beforeunload instead
        onRequestClose: () => {
            // Handled by beforeunload event below
        },
        confirmClose: () => {
            // No-op in web version
        },
        showUnsavedDialog: async () => {
            // Return 1 ("Don't Save") since beforeunload handles the prompt
            return 1;
        }
    };

    // Set up beforeunload for unsaved changes warning
    window.addEventListener('beforeunload', (e) => {
        if (typeof State !== 'undefined' && State.isDirty) {
            e.preventDefault();
        }
    });
})();

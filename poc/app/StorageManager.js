// StorageManager handles loading and saving sheets saved in localStorage.
const StorageManager = {
  STORAGE_PREFIX: "sheetData_",
  LAST_SAVE_KEY: "sheetConfig_lastSave",

  load(key) {
    if (!key) {
      throw `error: save name must not be empty`;
    }
    key = this.STORAGE_PREFIX + key;
    let json = localStorage.getItem(key);
    if (json == null) {
      return null;
    }
    try {
      return JSON.parse(json);
    } catch (e) {
      console.error("error parsing JSON from local storage", e);
      return null;
    }
  },

  save(data, key) {
    if (data === undefined) {
      throw `error: trying to save undefined data`;
    }
    if (!key) {
      throw `error: save name must not be empty`;
    }
    key = this.STORAGE_PREFIX + key;
    let json;
    console.debug("Saving data to local storage", data);
    try {
      json = JSON.stringify(data);
    } catch (e) {
      console.error("error stringifying JSON for local storage", e);
      throw e;
    }
    localStorage.setItem(key, json);
  },

  delete(key) {
    key = this.STORAGE_PREFIX + key;
    localStorage.removeItem(key);
  },

  getKeys() {
    let nKeys = localStorage.length;
    let keys = [];
    for (let i = 0; i < nKeys; i++) {
      let key = localStorage.key(i);
      if (key.startsWith(this.STORAGE_PREFIX)) {
        key = key.slice(this.STORAGE_PREFIX.length);
        keys.push(key);
      }
    }
    return keys;
  },

  get savesExist() {
    return this.getKeys().length > 0
  },

  get lastSave() {
    return localStorage.getItem(this.LAST_SAVE_KEY);
  },

  set lastSave(val) {
    localStorage.setItem(this.LAST_SAVE_KEY, val);
  },
}

export default StorageManager;

# Chainbound Courses

This folder is the default home for preset course data.

The browser level editor downloads `.json` files because a normal web page cannot silently write into this repository folder. To make an exported hole available as a built-in playable preset:

1. Save the hole from the Level Editor.
2. Move the downloaded JSON file into this folder.
3. Add the hole to `course-library.js`.

`course-library.js` has two parts:

- `window.CHAINBOUND_COURSE_FILES`: a manifest of source JSON files.
- `window.CHAINBOUND_COURSES`: the playable course bundle used when `index.html` is opened directly as a `file://` URL.

Browsers often block `fetch()` for local JSON files when using `file://`, so `CHAINBOUND_COURSES` is what makes the level selector work without a local server. Keep the JSON files as the editable source, then copy their data into the playable bundle.

Manifest shape:

```js
window.CHAINBOUND_COURSE_FILES = [
  {
    courseId: "deep-woods",
    courseName: "Deep Woods",
    file: "courses/deep-woods-hole-1-the-grove.json"
  },
  {
    courseId: "deep-woods",
    courseName: "Deep Woods",
    file: "courses/deep-woods-hole-2-the-wall.json"
  }
];
```

Hole JSON shape:

```json
{
  "name": "The Grove",
  "courseId": "deep-woods",
  "courseName": "Deep Woods",
  "holeNumber": 1,
  "par": 3,
  "columns": 7,
  "rows": 13,
  "tee": { "x": 3, "y": 10 },
  "basket": { "x": 3, "y": 4 },
  "hazards": [
    { "type": "tree", "variant": 1, "height": 3, "x": 2, "y": 2 },
    { "type": "shrub", "variant": 1, "height": 2, "x": 4, "y": 4 },
    { "type": "rock", "variant": 4, "height": 1, "width": 2, "x": 1, "y": 6 },
    { "type": "obstacle", "variant": 1, "height": 1, "x": 5, "y": 6 }
  ],
  "backgrounds": [
    { "type": "water", "x": 1, "y": 8 },
    { "type": "water2", "x": 2, "y": 8 },
    { "type": "sand1", "x": 3, "y": 8 }
  ],
  "decorations": [
    { "type": "decor", "variant": 1, "x": 4, "y": 8 }
  ],
  "outOfBounds": [
    { "x": 0, "y": 0 }
  ]
}
```

The game groups holes by `courseId`, sorts them by `holeNumber`, and plays them in that order. To add more holes to a course, add another manifest entry with the same `courseId` and `courseName`.

Water and sand are stored in `backgrounds`, not `hazards`. Decor is stored in `decorations` and is visual-only. OB is stored in `outOfBounds`; it displays in the editor only and is invisible during play. Wide assets such as `rock4_1x2.png` are saved as a hazard with `width: 2`, anchored on the left tile.

Note: if the game is run through a local server, the manifest JSON fetch path can work. If the game is opened directly from disk, the embedded `CHAINBOUND_COURSES` data is used.

# Network headshots

Photographs for the people listed on the Network page (Tools → Network). The
page is built to run without them: any entry with no photo renders a lettered
placeholder tile of exactly the same size, so adding a headshot never moves the
rest of the grid.

## Adding a headshot

1. Crop the photo square and export it as JPEG at **512 × 512** or larger. The
   card displays it in a 104px circle, so a square crop centred on the face is
   what matters; anything wider gets centre-cropped by the browser.
2. Save it here as `<person-id>.jpg`, using the `id` from the entry in
   `src/data.js` — for example `assets/network/james-mann.jpg`.
3. Set the `headshot` field on that entry:

   ```js
   headshot: '/assets/network/james-mann.jpg',
   ```

The current entries and their ids:

| id                 | Person             |
| ------------------ | ------------------ |
| `pamella-grear`    | Pamella Grear      |
| `j-douglas-bailey` | J. Douglas Bailey  |
| `james-mann`       | James Mann         |
| `john-ross-moyler` | John-Ross Moyler   |

Use each person's own photo, supplied by them, and keep the file under about
300 KB so the page stays quick on a phone.

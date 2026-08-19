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

| id                 | Person             | Photo                    |
| ------------------ | ------------------ | ------------------------ |
| `pamella-grear`    | Pamella Grear      | `pamella-grear.jpg`      |
| `j-douglas-bailey` | J. Douglas Bailey  | `j-douglas-bailey.jpg`   |
| `james-mann`       | James Mann         | `james-mann.jpg`         |
| `anthony-t-scott`  | Anthony T. Scott   | `anthony-t-scott.jpg`    |
| `john-ross-moyler` | John-Ross Moyler   | `john-ross-moyler.jpg`   |

Every photo on file was supplied by the person in it and cropped square at
512 × 512 from the portrait they sent. Two arrived smaller than the target and
were scaled up to match the set: Pamella's came in square at 476 × 476, and
Anthony's at 200 × 200. If a larger original of Anthony's turns up, replacing
the file is the whole change — nothing else references its dimensions.

Pamella's headshot also serves as the portrait on the About page
(`#/about`), so replacing `pamella-grear.jpg` updates both places at once.

Use each person's own photo, supplied by them, and keep the file under about
300 KB so the page stays quick on a phone.

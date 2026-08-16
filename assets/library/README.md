# A Cup of Compassion digital library

This directory contains the complete app library: six books and two companion workbooks, each shipped as PDF and EPUB, plus the cover art for all eight titles.

The book PDFs use their production 6.25 x 10 inch fixed layouts. The workbooks use US Letter pages for practical home printing. The EPUB editions are reflowable for e-readers and phones.

## Cover art

`covers/` holds the production cover of every title at 1600 × 2560, with a 640px
grid thumbnail in `covers/thumbs/`. Both are extracted from the EPUB masters by
`tools/extract_library_covers.py` and listed in `catalog.json` with byte counts
and SHA-256 hashes, the same as the editions themselves. They are not part of
`SHA256SUMS.txt`, which stays a manifest of the 16 publication files;
`tools/verify_library_assets.py` checks the covers against the catalog instead.

## Integrity check

The PDF and EPUB files are committed as ordinary Git binary objects, not text previews or Git LFS pointers. GitHub can omit binary diff previews for large files; that does not truncate the committed downloads.

After cloning, verify all sixteen publication files with:

```sh
cd assets/library
sha256sum -c SHA256SUMS.txt
```

`catalog.json` provides the same hashes, byte counts, and public app paths for deployment checks.

For the complete release audit—catalog order, all 16 checksums and byte counts, EPUB package
structure, PDF parsing, cover renditions, and the app's PDF/EPUB links—run:

```sh
python3 tools/verify_library_assets.py --root .
```

To test complete downloads from a deployed app (not just the committed files), add its URL:

```sh
python3 tools/verify_library_assets.py --root . --base-url https://your-deployment.example
```

Run the same command before each release or after changing any publishing asset.

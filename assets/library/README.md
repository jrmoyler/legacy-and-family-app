# A Cup of Compassion digital library

This directory contains the complete app library: six books and two companion workbooks in PDF and EPUB, plus The Compassion Legacy Journal in illustrated PDF format.

The book PDFs use their production 6.25 x 10 inch fixed layouts. The workbooks use US Letter pages for practical home printing. The EPUB editions are reflowable for e-readers and phones.

## Integrity check

The PDF and EPUB files are committed as ordinary Git binary objects, not text previews or Git LFS pointers. GitHub can omit binary diff previews for large files; that does not truncate the committed downloads.

After cloning, verify all seventeen publication files with:

```sh
cd assets/library
sha256sum -c SHA256SUMS.txt
```

`catalog.json` provides the same hashes, byte counts, and public app paths for deployment checks.

For the complete release audit—catalog order, all 17 checksums and byte counts, canonical author
metadata, EPUB package structure, PDF parsing, and the app's PDF/EPUB links—run:

```sh
python3 tools/verify_library_assets.py --root .
```

To test complete downloads from a deployed app (not just the committed files), add its URL:

```sh
python3 tools/verify_library_assets.py --root . --base-url https://your-deployment.example
```

Run the same command before each release or after changing any publishing asset.

# Built book files

One EPUB per book in the series. These are the fulfilment masters — the files a
buyer would be sent — not downloads the app hands out.

## Naming

```
A-Cup-of-Compassion-<NN>-<Title-In-Hyphens>.epub
```

`<NN>` is the number printed on that book's **own cover**. It is not a series
number this project asserts: two numbering schemes are still in conflict and
more than one cover claims the same slot (see the Production status screen).
The number is in the filename so a file can be matched to a cover without
opening it. When a scheme is finally locked, renaming these is part of that
job.

## What is here

| File | Book | `BOOKS[].id` |
|---|---|---|
| `A-Cup-of-Compassion-01-The-Benefit-of-Having-Compassion.epub` | The Benefit of Having Compassion | `benefit` |
| — *missing* — | Are You Born in Compassion or Nurtured in It? | `nurtured` |
| `A-Cup-of-Compassion-03-Compassion-and-Legacy.epub` | Compassion and Legacy | `legacy` |
| `A-Cup-of-Compassion-04-Compassion-or-Confusion.epub` | Compassion or Confusion? | `confusion` |
| `A-Cup-of-Compassion-05-Compassion-and-Commitment.epub` | Compassion, Commitment, and Confinement | `commitment` |
| `A-Cup-of-Compassion-06-Compassion-and-Companionship.epub` | Compassion and Companionship | `companionship` |

Every file is mapped to its book by the `epub` field in `src/data.js`. That
field is the single source of truth: the Production status screen derives its
on-hand and missing lists from it, so adding a file here means editing `epub`
in the same commit.

### Book 02 is missing

The EPUB delivered for *Are You Born in Compassion or Nurtured in It?* was
truncated. It ends partway through the fourth image, so:

- **intact** — `mimetype`, `EPUB/content.opf`, cover art, three of four images
- **absent** — all ten chapter files (`text/ch001` … `ch010.xhtml`),
  `nav.xhtml`, `toc.ncx`, `styles/stylesheet1.css`, and the zip central
  directory

There is no central directory and no chapter text anywhere in the bytes, so it
is not repairable — the book has to be re-exported. A file no reader can open
is worse in the repository than an absent one, so it was not committed and
`epub` is `null` for that book.

## Verifying a file before committing it

An EPUB is a zip. If it does not open as one, it is broken:

```sh
python3 -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); \
  print(z.read('mimetype').decode(), len(z.namelist()), 'entries', z.testzip())" file.epub
```

Expect `application/epub+zip`, an entry count, and `None`.

## These files are public once deployed

The site is static. Anything in this folder is served to anyone who requests
its URL, whether or not the app links to it — and the finished books are sold.
Nothing in the app links here, `vercel.json` sends `X-Robots-Tag: noindex` so
they stay out of search results, and neither of those is access control. If the
paid books are to be genuinely gated, fulfilment has to move behind something
that checks for a purchase — signed time-limited URLs, or delivery by email —
and these masters have to move out of the deployed directory.

# Homepage memory and transfer audit - September 8, 2026

Fresh Chromium on macOS, 1440 x 900 viewport. Renderer resident memory (RSS), not Chrome's tab-hover accounting. Each isolation case starts a new browser; figures are snapshots and can vary.

| Case | Renderer RSS |
| --- | ---: |
| One heading | 80 MiB |
| Homepage with external assets blocked | 102 MiB |
| Homepage with fonts blocked | 123 MiB |
| Homepage with images blocked | 118 MiB |
| Full homepage | 121 MiB |

A separate cold network capture measured roughly 41 KB transferred and 1.1 MB of JavaScript heap on the homepage. RSS includes substantially more than JavaScript heap. These results do not isolate every browser allocation or establish a universal memory baseline. Fonts and image compression are not a demonstrated explanation for the reported initial 100 MB tab figure.

The homepage loads three small SVG previews, no embedded applications, video, photo collection, or PDF viewer. CI enforces an initial transfer ceiling of 150 KB against the uncompressed local preview and rejects added embeds or extra images. Hosted transfers are smaller because Cloudflare compresses text.

Photo galleries use responsive WebP and lazy loading. Full-photo pages also use responsive selection, with sizes accounting for viewport height. Small derivatives use quality 72; larger viewing derivatives retain quality 78. A 20-image 800-pixel sample saved 14% between quality 78 and 72. This is not a claim of equivalent process-memory savings.

Six navigations from homepage to 2022 and back reached 194 MiB RSS. A comparable fresh run followed by explicit garbage collection and a simulated critical memory-pressure notification measured 157 MiB. This demonstrates reclaimable allocations, but is not a complete leak diagnosis or a precise attribution to any particular cache. No memory-pressure hack or back-navigation disabling was added to the website.

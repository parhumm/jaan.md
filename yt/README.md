# YouTube Embed Attribution Test Site

A static test site for diagnosing why YouTube embed views are tracked for some sites (e.g., IMVBox) but not others (e.g., Televika). Six configurations × six distinct YouTube videos × six distinct subdomains, all served from one Cloudflare Pages project.

## Layout

| Host | Test | Video ID | Model |
|---|---|---|---|
| `yt.jaan.md` | index | — | — |
| `a.yt.jaan.md` | A | `lBQfBKQ2-L4` | current Televika baseline |
| `b.yt.jaan.md` | B | `RTIPjOEVZIE` | baseline + iframe `referrerpolicy` |
| `c.yt.jaan.md` | C | `ZrFi-Hi4GBk` | `enablejsapi` + `origin` |
| `d.yt.jaan.md` | D | `UqKvW7ggYWo` | `widget_referrer` only |
| `e.yt.jaan.md` | E | `Xepdyj_BDew` | full fixed static iframe |
| `f.yt.jaan.md` | F | `BLx3d7m8l-c` | full IFrame API player |

## Local preview

```sh
cd yt
python3 -m http.server 8080
```

Open `http://localhost:8080/a-current-televika/` (and similar paths). The host-based subdomain routing in `functions/_middleware.ts` does **not** run locally under `python3 -m http.server` — it runs only on Cloudflare Pages. `widget_referrer`/`origin` params reference the production subdomains, so embed identity won't match locally, but the pages still render and you can verify markup.

To test the middleware locally, use Wrangler:

```sh
npx wrangler pages dev yt
```

## Cloudflare Pages deployment

Create a **new** Pages project (not the existing jaan.md Astro Worker project) and configure it as:

| Setting | Value |
|---|---|
| Framework preset | None / Static |
| Build command | *(empty — or `echo "static site"` if Cloudflare requires one)* |
| Build output directory | `yt` |
| Root directory | repo root |

## Custom domains (non-negotiable)

Even with a wildcard DNS record, Cloudflare Pages will not serve any subdomain whose hostname isn't explicitly added as a custom domain on the project (wildcard custom domains are Enterprise-only). Add **all seven** of these in **Pages → your-project → Custom domains**:

- `yt.jaan.md`
- `a.yt.jaan.md`
- `b.yt.jaan.md`
- `c.yt.jaan.md`
- `d.yt.jaan.md`
- `e.yt.jaan.md`
- `f.yt.jaan.md`

Without these, DNS resolves but Pages rejects the host header. Each entry also triggers SSL cert issuance for that hostname.

## DNS (wildcard)

Instead of seven explicit records, add a wildcard plus the root:

```
yt        CNAME  <project>.pages.dev    proxied
*.yt      CNAME  <project>.pages.dev    proxied
```

The wildcard makes future test additions (e.g., a phase-2 `g.yt.jaan.md`) zero-DNS-work — just add the custom domain in Pages.

## Routing

Handled in code by `functions/_middleware.ts`. The middleware reads the `Host` header, maps each test subdomain to its folder, and rewrites the request via the Pages `ASSETS` binding. It also stamps `Referrer-Policy` and `X-Content-Type-Options` on every response as a second layer of defense beyond `_headers`.

No dashboard routing rules required.

## Verifying headers post-deploy

```sh
for h in yt.jaan.md a.yt.jaan.md b.yt.jaan.md c.yt.jaan.md d.yt.jaan.md e.yt.jaan.md f.yt.jaan.md; do
  echo "=== $h ==="
  curl -sI "https://$h/" | grep -iE 'referrer-policy|x-content-type'
done
```

Expect `Referrer-Policy: strict-origin-when-cross-origin` and `X-Content-Type-Options: nosniff` on every host.

## Test execution guidance

- **50–80 manual plays per video** is the recommended minimum.
- Each play should watch **60–120 seconds** of the video.
- Use **different real users, devices, and networks**. YouTube's bot detection will suppress mass plays from one device/IP.
- **Always use the subdomain URLs** (`a.yt.jaan.md`, …, `f.yt.jaan.md`) for real test plays. The path-equivalent URLs under `yt.jaan.md` (e.g., `yt.jaan.md/a-current-televika`) are **for debugging only** — playing them produces a `Referer` of `yt.jaan.md` instead of the per-test subdomain, breaking experimental isolation between tests.
- **Wait 48–72 hours** before checking YouTube Studio. External attribution data is not real-time.

## Where to look in YouTube Studio

Per video:

1. **Content** → select the video → **Analytics**.
2. **Reach** tab → **Traffic source: External**. Look for entries referencing each respective subdomain.
3. Also check **Advanced Mode** → **Traffic source type**, **Playback location**, and look for **Direct or unknown** which often catches suppressed referrers.

Interpretation:
- Subdomain appears → YouTube attributes that configuration. Good.
- Subdomain missing → YouTube suppressed or failed to attribute. Bad. Because each test uses a distinct subdomain, missing entries point to a specific embed configuration, not just "the site".

## QA checklist (per page)

1. Open DevTools → Network.
2. Find the request to `youtube.com/embed/<VIDEO_ID>`.
3. Confirm the `Referer` header is `https://<subdomain>/` — not absent, not `no-referrer`.
4. Confirm no YouTube **Error 153** in the player.
5. Play manually and watch 60–120 seconds.
6. For Test F, confirm DevTools console logs `[YT_TEST] … READY` and `[YT_TEST] … STATE PLAYING`.

## Deferred (phase 2)

- `g.yt.jaan.md` with route-scoped `Referrer-Policy: no-referrer` — useful only if phase-1 results are ambiguous. Wildcard DNS already covers it; just add the custom domain in Pages and create `yt/g-no-referrer-control/index.html`.

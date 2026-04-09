// STEP 1: BOOTSTRAP SESSION (VERY IMPORTANT)
const res0 = await fetchWithCookies(BASE, {
  method: "GET",
  headers: {
    "user-agent": "Mozilla/5.0",
    "accept": "text/html",
  },
});

// Follow redirect if present
const redirectedUrl = res0.url;

const res1 = await fetchWithCookies(redirectedUrl, {
  method: "GET",
  headers: {
    "user-agent": "Mozilla/5.0",
    "accept": "text/html",
  },
});

const html1 = await res1.text();
const { apiFetch } = require("./client");

const CDN_URL = process.env.CDN_URL || "https://cdn100ka.sysvenus.com";

async function getBrands() {
  const data = await apiFetch("/brands/public");
  return (data.brands || []).map((b) => {
    const firstProduct = b.products && b.products[0];
    const bgKey = firstProduct && firstProduct.imageKeys && firstProduct.imageKeys[0];
    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      logo: b.logoKey ? `${CDN_URL}/${b.logoKey}` : null,
      bgImage: bgKey ? `${CDN_URL}/${bgKey}` : null,
    };
  });
}

module.exports = { getBrands };

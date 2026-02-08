// Example of checking for a "deal" in Kroger's response
export async function getKrogerProduct(upc: string, locationId: string) {
    const token = await getKrogerToken(); // You'll need an OAuth2 helper
    const url = `https://api.kroger.com/v1/products/${upc}?filter.locationId=${locationId}`;

    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    const product = data.data;

    // Logic to identify a "Coupon" or "Sale"
    const hasDeal = product.price.promo < product.price.regular;
    const savings = product.price.regular - product.price.promo;

    return {
        name: product.description,
        regularPrice: product.price.regular,
        salePrice: product.price.promo,
        isDeal: hasDeal,
        discountAmount: savings > 0 ? savings : 0,
        expires: product.price.expirationDate?.value
    };
}
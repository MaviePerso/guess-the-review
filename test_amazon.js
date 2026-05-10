const amazon = require('amazon-buddy');

async function test() {
  try {
    console.log("Searching for products...");
    const products = await amazon.products({ keyword: 'bizarre', number: 5, country: 'FR' });
    if (!products.result || products.result.length === 0) {
      console.log("No products found.");
      return;
    }
    const product = products.result[0];
    console.log("Found product:", product.title);
    console.log("Image:", product.thumbnail);

    console.log("Fetching reviews for ASIN:", product.asin);
    const reviews = await amazon.reviews({ asin: product.asin, number: 5, country: 'FR' });
    if (!reviews.result || reviews.result.length === 0) {
      console.log("No reviews found.");
      return;
    }
    const review = reviews.result[0];
    console.log("Review:", review.review);
    console.log("Rating:", review.rating);
  } catch (error) {
    console.error("Error fetching Amazon data:", error.message);
  }
}

test();

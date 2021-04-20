import validateShop from "../shop-validator";

test("returns true for valid shop urls", () => {
  const shopUrl1 = "someshop.myshop0.com";
  const shopUrl2 = "devshop.myshop0.io";
  const shopUrl3 = "test-shop.myshop0.com";
  const shopUrl4 = "dev-shop-.myshop0.io";

  expect(validateShop(shopUrl1)).toBe(true);
  expect(validateShop(shopUrl2)).toBe(true);
  expect(validateShop(shopUrl3)).toBe(true);
  expect(validateShop(shopUrl4)).toBe(true);
});

test("returns false for invalid shop urls", () => {
  const shopUrl = "notshop0.com";
  const anotherShop = "-invalid.myshop0.io";
  expect(validateShop(shopUrl)).toBe(false);
  expect(validateShop(anotherShop)).toBe(false);
});

test("returns false for invalid shop urls, even if they contain the string 'myshop0.io'", () => {
  const shopUrl = "notshop0.myshop0.io.org/potato";
  expect(validateShop(shopUrl)).toBe(false);
});

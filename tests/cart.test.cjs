const {test}=require('node:test');
const assert=require('node:assert/strict');
const {isAddAction}=require('../extension/cart.js');
test('recognizes explicit add actions and icon descriptions in German and English',()=>{
  for(const label of ['cart add','cart_add','Cart Add','Add items','🛒 Add items','Add Items (1)','Add to cart','add_shopping_cart','In den Warenkorb','Zum Warenkorb hinzufügen','Tickets dem Warenkorb hinzufügen']) assert.equal(isAddAction(label),true,label);
});
test('cart navigation, checkout, removal and unrelated add actions are not add-to-cart targets',()=>{
  for(const label of ['Warenkorb','Zum Warenkorb','Shopping cart','Checkout','Hinzufügen','Add items to wishlist','Remove from cart','Zur Kasse','Add to calendar']) assert.equal(isAddAction(label),false,label);
});

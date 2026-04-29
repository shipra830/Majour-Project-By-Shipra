const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const {isLoggedIn, isOwner, validateListing} = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer  = require('multer')
const { storage } = require("../cloudConfig.js"); 
const upload = multer({ storage});
const User = require("../models/user");
const Booking = require("../models/booking");

router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

//New Route
router.get("/new", isLoggedIn, listingController.renderNewForm);

// ================= WISHLIST START =================

router.get("/wishlist", isLoggedIn, wrapAsync(async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist");

  res.render("listings/wishlist.ejs", {
    wishlist: user.wishlist
  });
}));

router.post("/:id/wishlist", isLoggedIn, wrapAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(req.user._id);

  if (!user.wishlist.includes(id)) {
    user.wishlist.push(id);
    await user.save();
  }

  res.redirect("/listings");
}));

router.post("/:id/unwishlist", isLoggedIn, wrapAsync(async (req, res) => {
  const { id } = req.params;

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { wishlist: id }
  });

  res.redirect("/wishlist");
}));

// ================= WISHLIST END =================
router.post("/:id/book", isLoggedIn, wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { checkIn, checkOut } = req.body;

  // ✅ listing fetch
  const listing = await Listing.findById(id);

  // ✅ nights calculate
  const nights = Math.ceil(
    (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
  );

  // ✅ total price calculate
  const totalPrice = nights * listing.price;

  const booking = new Booking({
    listing: id,
    user: req.user._id,
    checkIn,
    checkOut,
    totalPrice   // ✅ new field
  });

  // ❗ check overlapping bookings
const existingBooking = await Booking.findOne({
  listing: id,
  $or: [
    {
      checkIn: { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) }
    }
  ]
});

if (existingBooking) {
  req.flash("error", "These dates are already booked!");
  return res.redirect(`/listings/${id}`);
}

  await booking.save();

  req.flash("success", "Booking Confirmed!");
  res.redirect("/listings");
}));
// Booking End

// ================= MY BOOKINGS =================

router.get("/bookings", isLoggedIn, wrapAsync(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("listing");

  res.render("listings/bookings.ejs", { bookings });
}));
// Booking Show End
router.route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
     upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.destroyListing)
  );



//Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;
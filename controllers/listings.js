const fetch = require("node-fetch"); //add this in controller listing.js
const Listing = require("../models/listing");
const User = require("../models/user");

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});

  let wishlist = [];

  if (req.user) {
    const user = await User.findById(req.user._id);
    wishlist = user.wishlist;
  }

  res.render("listings/index.ejs", { allListings, wishlist });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  console.log(listing);
  res.render("listings/show.ejs", { 
    listing,
    mapToken: process.env.MAP_TOKEN
});
};
module.exports.createListing = async (req, res, next) => {
  let url = req.file.path;
  let filename = req.file.filename;

  const key = process.env.MAP_TOKEN;//se replace krdo
  const location = req.body.listing.location;

  const response = await fetch(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(location)}.json?key=${key}`
  );

  const data = await response.json();

  if (!data.features.length) {
    req.flash("error", "Invalid location");
    return res.redirect("/listings/new");
  }

  const coords = data.features[0].geometry.coordinates;

  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };

  newListing.geometry = {
    type: "Point",
    coordinates: coords,
  };

  await newListing.save();

  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  const listing = await Listing.findById(req.params.id);

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");

  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
  let listing =  await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (typeof req.file !== "undefined") {
  let url = req.file.path;
  let filename = req.file.filename;
  listing.image = { url, filename };
  await listing.save();
}
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
  };

  module.exports.destroyListing = async (req, res) => {
  await Listing.findByIdAndDelete(req.params.id);
  req.flash("success", " Listing Deleted!");
  res.redirect("/listings");

}
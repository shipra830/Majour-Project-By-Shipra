const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");const { required } = require("joi");

const listingSchema = new mongoose.Schema({
  title: String,

  description: String,

  image: {
    url: String,
    filename: String,
  },

  price: Number,
  location: String,
  country: String,

  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    }
  ],

  //  YAHI ADD KIYA (reviews ke just baad)
  geometry: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },

  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

// delete associated reviews
listingSchema.post("findOneAndDelete", async (listing) => { console.log(listing);
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
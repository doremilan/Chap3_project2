const mongoose = require("mongoose");

// const UserSchema = new mongoose.Schema({
//   nickname: String,
//   password: String,
// });

// UserSchema.virtual("userId").get(function () {
//   return this._id.toHexString();
// });

// UserSchema.set("toJSON", {
//   virtuals: true,
// });

const articlesSchema = mongoose.Schema({
  writer: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
  },
  password: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
  },
  // image: {
  //   type: String,
  // },
  totalLike: {
    type: Number,
    default: 0,
  },
  like_users: [],
});

module.exports = mongoose.model("Articles", articlesSchema);

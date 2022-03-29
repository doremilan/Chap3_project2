const mongoose = require("mongoose");

const commentSchema = mongoose.Schema({
    comment: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        ref: 'User',
        required: true,
    },
    postId: {
        type: String,
    },
});

module.exports = mongoose.model("Comments", commentSchema);
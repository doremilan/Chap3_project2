const mongoose = require("mongoose");

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
    date:{
        type: String,
    },
});

module.exports = mongoose.model("Articles", articlesSchema);
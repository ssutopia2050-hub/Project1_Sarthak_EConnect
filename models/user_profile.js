import mongoose from "mongoose";

const user_profile = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    mobile_number: {
        type: String,
        required: true,
        trim: true,
        maxlength: 10,
    },
    questions_attempted: {
        type: Number,
        required: true,
        default: 0,
    },
    role: {
       type: String,
        required: true,
        enum: ["student", "educator","employee","administrator"],
        trim: true,
    },
    tier_type:{
        type: String,
        required: true,
        enum: ["free_tier","tier_1","tier_2"],
        trim: true,
    },
    pin:{
        type: String,
        required: true,
    },
    age:{
        type: String,
        required: true,
        trim: true,
    }
});

export default mongoose.model("user_profile", user_profile);
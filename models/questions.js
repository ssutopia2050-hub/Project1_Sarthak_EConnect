import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
    {
        // REQUIRED
        question: {
            type: String,
            required: true,
            trim: true
        },

        subject: {
            type: String,
            required: true,
            // enum: ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "General Knowledge"]
        },

        difficulty: {
            type: String,
            required: true,
            // enum: ["Easy", "Moderate", "Hard"]
        },

        competition: {
            type: String,
            required: true,
            // enum: ["JEE", "NEET", "Boards", "Olympiad", "Other"]
        },

        // OPTIONAL BUT VERY USEFUL 👇
        topic: {
            type: String,
            trim: true
        },
        class:{
            type: String,
            required: true,
        },
        solution_text:{
            type:String,
            required:true,
            default:" "
        },
        solution_video:{
            type:String,
            default:" "
        },
        solution_image:{
            type:String,
            default:" "
        }

    },
    {
        timestamps: true // adds createdAt & updatedAt
    }
);

export default mongoose.model("Question", questionSchema);
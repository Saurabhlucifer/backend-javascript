import mongoose,{Schema} from "mongoose";

const playlistSchema=new Schema({

    name:{
        type: String,
        req: true
    },
    description: {
        type: String,
        req: true
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }


},{timestamps: true})


export const PlayList=mongoose.model("Playlist",playlistSchema)
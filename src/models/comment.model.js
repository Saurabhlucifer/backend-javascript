import mongoose,{Schema} from "mongoose";

const commentSchema=new Schema({
content: {
    type: String,
    req: true
},
owner:{
    tyoe: Schema.Types.ObjectId,
    ref: "User"
}

},{timestamps: true})



export const Comment=mongoose.Schema("Comment",commentSchema)
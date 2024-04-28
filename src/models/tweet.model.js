import mongoose,{Schema} from "mongoose";

const tweetSchema=new Schema({
content: {
    type: String,
    req: true
},
owner:{
    tyoe: Schema.Types.ObjectId,
    ref: "User"
}

},{timestamps: true})



export const Tweet=mongoose.Schema("Tweet",tweetSchema)
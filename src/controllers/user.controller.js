import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"




const generateAccessandRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken ()    
        
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken}
        


    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
   // get user details from frontend
   // validation - not empty
   // check if user already exists: username and email
   // check for images,check for avatar
   // upload them to cloudinary, avatar
   // create user object - create entry in db
   // remove password and refresh token field from response
   // check for user creation
   // return response


const{fullname, email, username, password}=req.body
console.log("email: ", email);
if(
    [fullname, email, username, password].some((field)=> 
    field?.trim()==="")
) {
    throw new ApiError(400, "All fields are required")
}

const existedUser = await User.findOne({
    $or:[{ username } ,{ email }]
})
if(existedUser)
throw new ApiError(409, "User wtih username or email already exists")

const avatarLocalPath = req.files?.avatar[0]?.path
//const userImageLocalPath = req.files?.coverimage[0]?.path

let userImageLocalPath
if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length>0)
{
    userImageLocalPath=req.files?.coverimage[0]?.path
}

if(!avatarLocalPath)
throw new ApiError(400, "Avatar file is required")


const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverimage = await uploadOnCloudinary(userImageLocalPath)

if(!avatar)
throw new ApiError(400,"Avatar file is required")

const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
    email,
    password,
    username: username.toLowerCase()
})

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)
if(!createdUser)
throw new ApiError(500, "Something went wrong while registering the user")



return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
)



})

const loginUser = asyncHandler(async(req,res)=>{
          // rq body-> data
          // username or email
          // find the user
          // password check
          //access and refresh token 
          //send cookies 
          const {email, username, password} = req.body
        
          if(!username && !email)
          throw new ApiError(400,'username or email is required')
          

    
       const user = await User.findOne({
        $or: [{username},{email}]
       })   
       if(!user)
       throw new ApiError(404,"user does not exist")

       const isPasswordValid = await user.isPasswordCorrect(password)

       if(!isPasswordValid)
       throw new ApiError(401,"Password Incorrect")

         const {accessToken,refreshToken} = await generateAccessandRefreshTokens(user._id)


        const loggedInUser=await User.findById(user._id).select(
                 "-password -refreshToken"
        )

        const options = { 
            httpOnly: true,
            secure: true
        }

        return res
        .status(200).cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
        "User logged in successfully"
    )
        )

})


const logoutUser = asyncHandler(async(req,res)=>{
       
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: undefined
                }
            },
            {
                new: true
            }
        )
        const options = {
            httpOnly: true,
            secure: true
        }
        return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{},"USer logged out"))


})

export {
    registerUser,
    loginUser,
    logoutUser
}
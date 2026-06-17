import mongoose from "mongoose";

const connectMogoose = async () => {
    await mongoose.connect(process.env.DB_CONNECT)
        .then(() => console.log('Mongodb connect successfully'))
        .catch((error) => console.log('Connection failed: ', error))
}
export default connectMogoose
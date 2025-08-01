import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const deleteFileFromS3 = async (fileName) => {
    const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
    };

    try {
        await s3.send(new DeleteObjectCommand(deleteParams));
        console.log(`Successfully deleted ${fileName} from S3.`);
        return true;
    } catch (error) {
        console.error(`Error deleting ${fileName} from S3:`, error);
        return false;
    }
};

export { deleteFileFromS3 };
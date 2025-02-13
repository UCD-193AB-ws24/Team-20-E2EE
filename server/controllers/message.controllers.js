
export const messageController = async (req, res) => {
    const { message } = req.body;
    console.log("Received message:", message);
    res.json({ response: `Message Received: ${message}` });
}
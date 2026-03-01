import { Request, Response } from 'express';
import axios from 'axios';

export const chatWithAI = async (req: Request, res: Response): Promise<void> => {
  const { query } = req.body;

  if (!query) {
    res.status(400).json({ error: "Query is required" });
    return;
  }

  try {
    // Call the Python Microservice running on Port 8000
    const pythonResponse = await axios.post('http://127.0.0.1:8000/chat', {
      query: query
    });

    // Send the AI's response back to the frontend
    res.json(pythonResponse.data);
  } catch (error: any) {
    console.error("AI Service Error:", error.message);
    res.status(500).json({ error: "Failed to communicate with AI Service" });
  }
};
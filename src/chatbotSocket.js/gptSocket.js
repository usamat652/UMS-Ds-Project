import axios from "axios";
import { Prompt } from "../models/openAi";


const userRequest = async (req, res) => {
  try {
    const openaiEndpoint = "https://api.openai.com/v1/chat/completions";
    const openaiApiKey = "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"; 

    const response = await axios.post(
      openaiEndpoint,
      {
        messages: [{ role: "user", content: req.body.question }],
        model: "gpt-3.5-turbo",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
      }
    );

    if (response && response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      throw new Error("Invalid response from OpenAI API");
    }
  } catch (error) {
    console.error("Error:", error.message);
    throw error; 
  }
};

export default userRequest;







// import {OpenAI} from 'openai';
// import { Prompt } from '../models/openAi.js';


// const openai = new OpenAI({
//     apiKey: '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',
//   });

// const OpenAi = async(req, res)=>{
//     try {
//         const { prompt } = req.body;
    
//         // Create a record in the Prompt table
//         const savedPrompt = await Prompt.create({ prompt });
    
//         // Generate a response using OpenAI's GPT-3
//         const response = await openai.chat.completions.create({
//             model: 'gpt-3.5-turbo',
//             messages: [{ role: 'user', content: prompt }],
//           });
    
//         const generatedResponse = response.data.choices[0].text.trim();
    
//         // Update the response field in the Prompt table
//         if (savedPrompt) {
//           await savedPrompt.update({ response: generatedResponse });
//         }

//         res.json({ response: generatedResponse });
//       } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Internal Server Error' });
//       }
// };

// export {OpenAi}
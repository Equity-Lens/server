// import { Request, Response } from "express";
// import { stockService } from "../services/stockService";

// export class StockController{

//     static async searchStocks(req: Request, res: Response): Promise<void>{

//         try{
//             const {q: query} = req.query;
//             if(!query || typeof query !== 'string'){
//                 res.status(400).json(
//                     {
//                     error: 'Query parameter "q" is not required',
//                     example: 'v1/stocks/search?q=apple',
//                     received: { query: req.query } 
//                     }
//                 );
//                 return;
//             }

//             const searchResult = await stockService.searchStocks(query);

//             res.json(searchResult);

//         }catch(error){

//             console.log('Stock search error: ', error);

//             res.status(500).json({
//                 error: 'Failed to search stocks',
//                 message: error instanceof Error ? error.message : 'Unknown error',
//             });
            
//         }

//     }

// }
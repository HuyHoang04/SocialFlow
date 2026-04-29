from app.main import app

if __name__ == "__main__":
    import uvicorn
    import logging
    import asyncio
    import sys
    import os

    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger(__name__)
    logger.info("=" * 60)
    logger.info("Starting SocialFlow AI Service v2.0")
    logger.info("=" * 60)
    logger.info("Address: http://0.0.0.0:5000")
    logger.info("Docs:    http://localhost:5000/docs")
    logger.info("Test:    curl http://localhost:5000/health")
    logger.info("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=5000, log_level="info")

import { collection_middleware } from "../../messaging/src/middleware/collection"

export default collection_middleware(
    add_base_meta_data,
    bi_messaging_middleware,
    logging
)
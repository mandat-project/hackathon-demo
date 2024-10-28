export async function wait(millis = 500) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
